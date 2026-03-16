<#
.SYNOPSIS
    EQN Pro Agent v2.0 - Global Edition
    Enterprise Management & Remote Control Engine

.DESCRIPTION
    A globally resilient agent designed for real-time telemetry, 
    software inventory, and remote command execution.
    Supports native WPF broadcasts and direct device control.

.VERSION 2.1.1
#>

# --- Configuration & Identity ---
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent" # Hardcoded for packaging; injected for dynamic deploy
$agentVersion = "2.1.1"
$logPath = "C:/ProgramData/EQNProAgent/agent.log"
$logoPath = "C:/ProgramData/EQNProAgent/logo.png"

# Ensure directory structure
if (!(Test-Path "C:/ProgramData/EQNProAgent")) { New-Item -Path "C:/ProgramData/EQNProAgent" -ItemType Directory -Force | Out-Null }

function Write-Log {
    param([string]$Message)
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$stamp] $Message" | Out-File $logPath -Append
}

# --- Telemetry Engine ---
function Get-HardwareTelemetry {
    try {
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
        if ($null -eq $cpu) { $cpu = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue }
        
        $mem = Get-CimInstance Win32_OperatingSystem
        $totalMem = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 0)
        $freeMem = [math]::Round($mem.FreePhysicalMemory / 1MB, 0)
        $ramUsage = [math]::Round((($totalMem - $freeMem) / $totalMem) * 100, 1)

        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        $totalDisk = [math]::Round($disk.Size / 1GB, 1)
        $freeDisk = [math]::Round($disk.FreeSpace / 1GB, 1)

        return @{
            cpuUsage = [math]::Round($cpu, 1)
            ramUsage = $ramUsage
            totalRam = $totalMem
            hddTotal = $totalDisk
            hddFree  = $freeDisk
        }
    } catch {
        Write-Log "Telemetry Error: $($_.Exception.Message)"
        return @{}
    }
}

function Get-NetworkIntelligence {
    try {
        $ipInfo = Invoke-RestMethod -Uri "https://ipapi.co/json/" -TimeoutSec 10
        return @{
            publicIp  = $ipInfo.ip
            location  = "$($ipInfo.city), $($ipInfo.region), $($ipInfo.country_name)"
            coords    = "$($ipInfo.latitude),$($ipInfo.longitude)"
            isp       = $ipInfo.org
        }
    } catch {
        Write-Log "Geo Error: My IP lookup failed, using fallback."
        return @{ publicIp = "Unknown"; location = "Global"; coords = "0,0"; isp = "Direct Access" }
    }
}

# --- Software Intelligence ---
function Get-SoftwareInventory {
    $software = @()
    $paths = @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*")
    
    foreach ($path in $paths) {
        Get-ItemProperty $path -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.DisplayName -and ($_.SystemComponent -ne 1) -and ($_.ParentKeyName -notlike "*Patch*")) {
                $software += @{
                    id        = $_.PSChildName
                    name      = $_.DisplayName
                    version   = $_.DisplayVersion
                    publisher = $_.Publisher
                }
            }
        }
    }
    return $software
}

# --- Identity Generation ---
function Get-DeviceIdentity {
    $serial = (Get-CimInstance Win32_Bios).SerialNumber
    if ([string]::IsNullOrWhiteSpace($serial) -or $serial -eq "0") {
        $serial = "HN-" + $env:COMPUTERNAME
    }
    return $serial
}

# --- Command Guard ---
function Invoke-BrandedMessage {
    param(
        [string]$Message,
        [string]$Title = "IT Support Alert"
    )
    $msgScriptPath = "C:/ProgramData/EQNProAgent/msg-$((Get-Date).Ticks).ps1"
    $escapedMsg = $Message.Replace('"', '`"').Replace("'", "''")
    $escapedTitle = $Title.Replace('"', '`"').Replace("'", "''")
    
    $scriptContent = @"
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System.Windows.Forms
`$logoPath = '$logoPath'
`$logoUri = "file:///`$logoPath"
`$xaml = '<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="$escapedTitle" Height="380" Width="480" WindowStyle="None" AllowsTransparency="True" Background="Transparent" WindowStartupLocation="CenterScreen" Topmost="True">
    <Border Background="#111111" CornerRadius="16" BorderBrush="#00d2ff" BorderThickness="2">
        <Grid Margin="25">
            <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
            <Image Grid.Row="0" Source="' + `$logoUri + '" Height="60" Margin="0,0,0,20" Stretch="Uniform" Name="logoImg"/>
            <TextBlock Grid.Row="1" Text="$escapedMsg" Foreground="White" FontSize="18" TextWrapping="Wrap" TextAlignment="Center" VerticalAlignment="Center" FontWeight="SemiBold"/>
            <StackPanel Grid.Row="2" Margin="0,20,0,0">
                <TextBlock Text="Sent by Equinox IT Support: for more information email us: itsupport@eqncs.com" Foreground="#666" FontSize="10" HorizontalAlignment="Center" Margin="0,0,0,15"/>
                <Button Name="btn" Content="Acknowledge" Height="36" Width="140" Background="#005a9c" Foreground="White" BorderThickness="0" FontSize="14" FontWeight="Bold">
                    <Button.Resources>
                        <Style TargetType="Border"><Setter Property="CornerRadius" Value="18"/></Style>
                    </Button.Resources>
                </Button>
            </StackPanel>
        </Grid>
    </Border>
</Window>'
if (!(Test-Path `$logoPath)) { `$xaml = `$xaml.Replace('Name="logoImg"', 'Visibility="Collapsed"') }
`$window = [Windows.Markup.XamlReader]::Load([System.Xml.XmlReader]::Create([System.IO.StringReader]::new(`$xaml)))
`$window.FindName('btn').Add_Click({`$window.Close()})
`$window.ShowDialog() | Out-Null
"@
    $scriptContent | Out-File $msgScriptPath -Encoding UTF8
    
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $msgScriptPath"
    $principal = New-ScheduledTaskPrincipal -GroupId "S-1-5-32-545" -RunLevel Highest -LogonType Interactive
    $taskName = "EQNMsg-$(Get-Random)"
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Force | Out-Null
    Start-ScheduledTask $taskName
    
    Start-Job -ScriptBlock { param($t, $s); Start-Sleep 600; Unregister-ScheduledTask $t -Confirm:$false; Remove-Item $s -Force } -ArgumentList $taskName, $msgScriptPath | Out-Null
}

# --- Result Reporting ---
function Send-Result {
    param(
        [string]$commandId,
        [string]$status,
        [string]$output,
        [string]$errorText
    )
    $payload = @{
        deviceId  = $deviceId
        commandId = $commandId
        status    = $status
        output    = $output
        error     = $errorText
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    try {
        Invoke-RestMethod -Uri "$serverUrl/result" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10 | Out-Null
    } catch {
        Write-Log "Result Send Failed: $($_.Exception.Message)"
    }
}

# --- Tool Synchronization ---
function Sync-SecurityTools {
    $tools = @("Check-FileEncryption", "Remove-FilePassword")
    $toolsDir = "C:\ProgramData\EQNProAgent\tools"
    if (!(Test-Path $toolsDir)) { New-Item -Path $toolsDir -ItemType Directory -Force | Out-Null }

    foreach ($tool in $tools) {
        $toolPath = Join-Path $toolsDir "$tool.ps1"
        $toolDownloadUrl = "$serverUrl/download?tool=$tool"
        
        Write-Log "Syncing Tool: $tool..."
        try {
            $code = Invoke-RestMethod -Uri $toolDownloadUrl -Headers @{"Cache-Control"="no-cache"} -TimeoutSec 10
            if ($code.Length -gt 100) {
                $code | Out-File -FilePath $toolPath -Force -Encoding UTF8
            }
        } catch {
            Write-Log "Failed to sync tool ${tool}: $($_.Exception.Message)"
        }
    }
}

# --- Core Loop ---
Write-Log "Agent v2.1.0 Started Up"
Sync-SecurityTools
$deviceId = Get-DeviceIdentity

while ($true) {
    try {
        $hw = Get-HardwareTelemetry
        $net = Get-NetworkIntelligence
        $sw = Get-SoftwareInventory
        
        $body = @{
            deviceId     = $deviceId
            hostname     = $env:COMPUTERNAME
            agentVersion = $agentVersion
            cpuUsage     = $hw.cpuUsage
            ramUsage     = $hw.ramUsage
            totalRam     = $hw.totalRam
            hddTotal     = $hw.hddTotal
            hddFree      = $hw.hddFree
            publicIp     = $net.publicIp
            localIp      = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
            isp          = $net.isp
            location     = $net.location
            coords       = $net.coords
            software     = $sw
            lastSeen     = [DateTime]::UtcNow.ToString("o")
        }

        $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 15
        
        # --- Auto-Update (OTA) Check ---
        if ($response.shouldUpdate -and $response.latestVersion) {
            Write-Log "OTA Notice: Current v$agentVersion vs Latest v$($response.latestVersion). Triggering Auto-Update."
            # Reuse the selfUpdate logic logic
            $updateCmd = @{ id = "ota-auto"; command = "selfUpdate" }
            if ($null -eq $response.commands) { $response.commands = @($updateCmd) }
            else { $response.commands += $updateCmd }
        }

        if ($response.commands) {
            foreach ($cmd in $response.commands) {
                $cmdId = $cmd.id
                Write-Log "Executing: $($cmd.command) (ID: $cmdId)"
                $output = ""
                $status = "completed"
                $err = ""
                
                try {
                    switch ($cmd.command) {
                        "restart"    { Restart-Computer -Force; $output = "Restart Initialized" }
                        "sync"       { $output = "Manual Sync successful (Telemetry refreshed)" }
                        "rename"     { Rename-Computer -NewName $cmd.params.newName -Force; $output = "Rename to $($cmd.params.newName) successful (Reboot required)" }
                        "runScript"  { 
                            # Lazy-sync for security tools if missing
                            if ($cmd.params.code -match "EQNProAgent\\tools\\") {
                                Write-Log "Detected security tool call. Verifying local tools..."
                                Sync-SecurityTools
                            }
                            $output = Invoke-Expression $cmd.params.code | Out-String 
                        }
                        "syncTools"  { Sync-SecurityTools; $output = "Manual tool synchronization complete" }
                        "msg"        { Invoke-BrandedMessage -Message $cmd.params.text -Title $cmd.params.title; $output = "Message displayed to user" }
                        "uninstallApp" {
                            $appId = $cmd.params.appId
                            Write-Log "Uninstalling: $appId"
                            $reg = Get-ItemProperty @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$appId", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$appId") -ErrorAction SilentlyContinue
                            if ($reg.UninstallString) {
                                $uString = $reg.UninstallString
                                if ($uString -match "MsiExec.exe") { $uString += " /quiet /norestart" }
                                Write-Log "Running: $uString"
                                cmd.exe /c $uString
                                $output = "Uninstallation command triggered for $appId"
                            } else {
                                $output = "Error: App $appId not found or no UninstallString available"
                                $status = "failed"
                                $err = $output
                            }
                        }
                        "installApp" {
                            $url = $cmd.params.url
                            $args = $cmd.params.args
                            $fName = $cmd.params.fileName
                            $tPath = Join-Path "C:\ProgramData\EQNProAgent" $fName
                            
                            Write-Log "Installing App: $fName"
                            try {
                                Invoke-WebRequest -Uri $url -OutFile $tPath -ErrorAction Stop
                                
                                # Automatic Silent Flags for common installers
                                if ($fName -like "*.msi" -and $args -notmatch "/qn") { $args += " /qn /norestart" }
                                if ($fName -like "*.exe" -and $null -eq $args) { $args = "/S" } # Generic fallback

                                Write-Log "Running Installer: $fName $args"
                                $p = Start-Process -FilePath $tPath -ArgumentList $args -Wait -PassThru -WindowStyle Hidden -ErrorAction Stop
                                $output = "Installation of $fName completed with Exit Code: $($p.ExitCode)"
                                Remove-Item $tPath -Force -ErrorAction SilentlyContinue
                            } catch {
                                $output = "Installation Failed: $($_.Exception.Message)"
                                $status = "failed"
                                $err = $output
                            }
                        }
                        "selfUpdate" {
                            $dUrl = "$serverUrl/download"
                            $enginePath = "C:\ProgramData\EQNProAgent\agent-engine.ps1"
                            Write-Log "Self-Update triggered from $dUrl"
                            try {
                                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                                $newC = Invoke-RestMethod -Uri $dUrl -Headers @{"Cache-Control"="no-cache"} -ErrorAction Stop
                                if ($newC.Length -gt 100) {
                                    $newC | Out-File -FilePath $enginePath -Force -Encoding UTF8
                                    $output = "Agent engine successfully updated to latest version. Process exiting for reload."
                                    Send-Result -commandId $cmdId -status "completed" -output $output -errorText ""
                                    Write-Log "Update applied. Exiting process..."
                                    # Use a job to exit after a tiny delay to ensure output is logged/sent
                                    Start-Job -ScriptBlock { Start-Sleep 2; Stop-Process -Id $using:PID -Force } | Out-Null
                                    exit
                                } else { throw "Downloaded engine too small." }
                            } catch {
                                $output = "Self-Update Failed: $($_.Exception.Message)"
                                $status = "failed"
                                $err = $output
                            }
                        }
                        default      { $output = "Unknown command: $($cmd.command)"; $status = "failed"; $err = $output }
                    }
                } catch {
                    $output = "Execution Error: $($_.Exception.Message)"
                    $status = "failed"
                    $err = $output
                }

                Send-Result -commandId $cmdId -status $status -output $output -errorText $err
                Write-Log "Result: $status - $output"
            }
        }
    } catch {
        Write-Log "Loop Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Seconds 60
}
