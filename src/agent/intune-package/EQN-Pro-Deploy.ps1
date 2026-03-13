<#
.SYNOPSIS
    EQN Pro Unified Agent v2.0.0 - Intune Ready
    Enterprise Management & Remote Control Engine

.DESCRIPTION
    This script is the UNIFIED INSTALLER for Agent v2.0.
    It handles directory setup, persistence, and launches the v2 engine.
    Optimized for Intune Win32 App deployment.

.VERSION 2.0.0
#>

# --- Configuration ---
$targetDir = "C:\ProgramData\EQNProAgent"
$engineFile = "agent-engine.ps1"
$targetPath = Join-Path $targetDir $engineFile
$logFile = Join-Path $targetDir "installer.log"
$logoPath = Join-Path $targetDir "logo.png"
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent" # Production URL

if (!(Test-Path $targetDir)) { New-Item -Path $targetDir -ItemType Directory -Force | Out-Null }

function Write-Log {
    param([string]$Message)
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$stamp] $Message" | Out-File $logFile -Append
}

Write-Log "EQN Pro Installer v2.0.0 Started"

# 1. Download Branding (Logo)
try {
    $baseUrl = $serverUrl.Replace("/api/agent", "")
    $logoUrl = "$baseUrl/equinox-logo.png"
    Write-Log "Downloading branding from $logoUrl"
    Invoke-WebRequest -Uri $logoUrl -OutFile $logoPath -ErrorAction SilentlyContinue
} catch {
    Write-Log "Warning: Branding download failed."
}

# 2. Deploy Agent Engine v2.0.0
# We use the v2 engine code directly here to make it a standalone installer
$engineSource = @'
<#
    EQN Pro Agent Engine v2.0.0 - Global
#>
$serverUrl = "[[SERVER_URL]]"
$agentVersion = "2.0.0"
$logPath = "C:/ProgramData/EQNProAgent/agent.log"
$logoPath = "C:/ProgramData/EQNProAgent/logo.png"

function Write-AgentLog { param($m); $s = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; "[$s] $m" | Out-File $logPath -Append }

# --- Telemetry ---
function Get-HardwareTelemetry {
    try {
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
        if ($null -eq $cpu) { $cpu = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue }
        $mem = Get-CimInstance Win32_OperatingSystem
        $totalMem = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 0)
        $freeMem = [math]::Round($mem.FreePhysicalMemory / 1MB, 0)
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        return @{ cpuUsage = [math]::Round($cpu, 1); ramUsage = [math]::Round((($totalMem - $freeMem) / $totalMem) * 100, 1); totalRam = $totalMem; hddTotal = [math]::Round($disk.Size / 1GB, 1); hddFree = [math]::Round($disk.FreeSpace / 1GB, 1) }
    } catch { return @{} }
}

function Get-NetworkIntelligence {
    try {
        $ipInfo = Invoke-RestMethod -Uri "https://ipapi.co/json/" -TimeoutSec 10
        return @{ publicIp = $ipInfo.ip; location = "$($ipInfo.city), $($ipInfo.region), $($ipInfo.country_name)"; coords = "$($ipInfo.latitude),$($ipInfo.longitude)"; isp = $ipInfo.org }
    } catch { return @{ publicIp = "Unknown"; location = "Global"; coords = "0,0"; isp = "Direct Access" } }
}

function Get-SoftwareInventory {
    $sw = @(); $paths = @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*")
    foreach($p in $paths) { Get-ItemProperty $p -ErrorAction SilentlyContinue | ForEach-Object { if($_.DisplayName -and ($_.SystemComponent -ne 1)) { $sw += @{ id = $_.PSChildName; name = $_.DisplayName; version = $_.DisplayVersion; publisher = $_.Publisher } } } }
    return $sw
}

function Get-DeviceIdentity {
    $s = (Get-CimInstance Win32_Bios).SerialNumber
    if ([string]::IsNullOrWhiteSpace($s) -or $s -eq "0") { $s = "HN-" + $env:COMPUTERNAME }
    return $s
}

function Invoke-BrandedMessage {
    param([string]$Message, [string]$Title = "IT Support Alert")
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
                    <Button.Resources><Style TargetType="Border"><Setter Property="CornerRadius" Value="18"/></Style></Button.Resources>
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

$deviceId = Get-DeviceIdentity
Write-AgentLog "Agent v2.0 Engine Started"

while ($true) {
    try {
        $hw = Get-HardwareTelemetry
        $net = Get-NetworkIntelligence
        $sw = Get-SoftwareInventory
        $body = @{ deviceId = $deviceId; hostname = $env:COMPUTERNAME; agentVersion = $agentVersion; cpuUsage = $hw.cpuUsage; ramUsage = $hw.ramUsage; totalRam = $hw.totalRam; hddTotal = $hw.hddTotal; hddFree = $hw.hddFree; publicIp = $net.publicIp; localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress; isp = $net.isp; location = $net.location; coords = $net.coords; software = $sw; lastSeen = [DateTime]::UtcNow.ToString("o") }
        $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 15
        if ($response.commands) {
            foreach ($cmd in $response.commands) {
                $output = ""; $status = "completed"
                try {
                    switch ($cmd.command) {
                        "restart" { Restart-Computer -Force; $output = "Restart Initialized" }
                        "sync" { $output = "Sync successful" }
                        "rename" { Rename-Computer -NewName $cmd.params.newName -Force; $output = "Renamed to $($cmd.params.newName)" }
                        "runScript" { $output = Invoke-Expression $cmd.params.code | Out-String }
                        "msg" { Invoke-BrandedMessage -Message $cmd.params.text -Title $cmd.params.title; $output = "Message displayed" }
                        "uninstallApp" {
                            $appId = $cmd.params.appId
                            $reg = Get-ItemProperty @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$appId", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$appId") -ErrorAction SilentlyContinue
                            if ($reg.UninstallString) { cmd.exe /c ($reg.UninstallString + " /quiet /norestart"); $output = "Uninstalling $appId" } else { $output = "Not found"; $status = "failed" }
                        }
                        "installApp" {
                            $u = $cmd.params.url; $a = $cmd.params.args; $fn = $cmd.params.fileName; $p = "C:\ProgramData\EQNProAgent\$fn"
                            try { Invoke-WebRequest -Uri $u -OutFile $p -ErrorAction Stop; $res = Start-Process -FilePath $p -ArgumentList $a -Wait -PassThru -WindowStyle Hidden; $output = "Installed $fn (Exit: $($res.ExitCode))"; Remove-Item $p -Force } catch { $output = "Fail: $($_.Exception.Message)"; $status = "failed" }
                        }
                    }
                } catch { $output = "Error: $($_.Exception.Message)"; $status = "failed" }
                Write-AgentLog "CMD: $($cmd.command) - $status"
            }
        }
    } catch { Write-AgentLog "Loop Error: $($_.Exception.Message)" }
    Start-Sleep -Seconds 60
}
'@

$engineContent = $engineSource.Replace("[[SERVER_URL]]", $serverUrl)
$engineContent | Out-File -FilePath $targetPath -Force -Encoding UTF8

# 3. Persistence Layer (Scheduled Task)
Write-Log "Registering persistence layer..."
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$targetPath`""
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).ToString("HH:mm") -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Unregister-ScheduledTask -TaskName "EQNProLiveAgent" -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $action -Trigger $trigger1, $trigger2 -Settings $settings -User "SYSTEM" -RunLevel Highest
    Start-ScheduledTask -TaskName "EQNProLiveAgent"
    Write-Log "Persistence registered and started successfully."
} catch {
    Write-Log "CRITICAL: Persistence registration failed: $($_.Exception.Message)"
}

Write-Log "EQN Pro Installer v2.0.0 Finished"
