<#
.SYNOPSIS
    EQN Pro Agent v2.0 - Global Edition
    Enterprise Management & Remote Control Engine

.DESCRIPTION
    A globally resilient agent designed for real-time telemetry, 
    software inventory, and remote command execution.
    Supports native WPF broadcasts and direct device control.

.VERSION 2.0.0
#>

# --- Configuration & Identity ---
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent" # Hardcoded for packaging; injected for dynamic deploy
$agentVersion = "2.0.0"
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

# --- Core Loop ---
Write-Log "Agent v2.0 Started Up"
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
        
        if ($response.commands) {
            foreach ($cmd in $response.commands) {
                Write-Log "Executing: $($cmd.command)"
                $output = ""
                $status = "completed"
                
                try {
                    switch ($cmd.command) {
                        "restart"    { Restart-Computer -Force; $output = "Restart Initialized" }
                        "sync"       { $output = "Manual Sync successful (Telemetry refreshed)" }
                        "rename"     { Rename-Computer -NewName $cmd.params.newName -Force; $output = "Rename to $($cmd.params.newName) successful (Reboot required)" }
                        "runScript"  { $output = Invoke-Expression $cmd.params.code | Out-String }
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
                            }
                        }
                        default      { $output = "Unknown command: $($cmd.command)"; $status = "failed" }
                    }
                } catch {
                    $output = "Error: $($_.Exception.Message)"
                    $status = "failed"
                }

                Write-Log "Result: $status - $output"
            }
        }
    } catch {
        Write-Log "Loop Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Seconds 60
}
