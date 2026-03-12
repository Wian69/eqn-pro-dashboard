# EQN Pro Unified Agent - Intune Deployable
# This script handles both Installation and Execution. 
# Optimized for Microsoft Intune "Win32 App" or "PowerShell Script" deployment.

# 0. Check for Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "CRITICAL: This script must be run as Administrator."
    exit 1
}

$TargetDir = "C:\ProgramData\EQNProAgent"
$ScriptName = "agent-engine.ps1"
$TargetPath = Join-Path $TargetDir $ScriptName
$LogFile = Join-Path $TargetDir "agent.log"
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent" # Update this to your production URL
$baseUrl = $serverUrl.Replace("/api/agent", "")
$deviceId = (Get-CimInstance Win32_BIOS).SerialNumber

# --- LOGGING FUNCTION ---
function Write-InstallerLog {
    param($message, $color = "Gray")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry -ForegroundColor $color
    try {
        if (-not (Test-Path $TargetDir)) { New-Item -Path $TargetDir -ItemType Directory -Force }
        $logEntry | Out-File -FilePath $LogFile -Append -ErrorAction SilentlyContinue
    }
    catch {}
}

# --- INSTALLATION LOGIC ---
function Install-Persistence {
    Write-InstallerLog "Installing EQN Pro Persistence Layer v1.2.4..." "Cyan"
    
    # 0. Aggressive Cleanup: Terminate ALL duplicate agent processes
    Write-InstallerLog "Cleaning up existing agent instances..." "Yellow"
    $currentPid = $PID
    $agentProcs = Get-WmiObject Win32_Process | Where-Object { ($_.CommandLine -like "*agent-engine.ps1*" -or $_.Name -eq "powershell.exe") -and $_.ProcessId -ne $currentPid }
    foreach ($p in $agentProcs) { 
        if ($p.CommandLine -like "*agent-engine.ps1*") {
            try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
    Start-Sleep -Seconds 2 # Wait for locks to release

    # 1. Download Branded Logo
    try {
        $logoUrl = "$baseUrl/equinox-logo.png"
        $logoPath = Join-Path $TargetDir "logo.png"
        Write-InstallerLog "Downloading corporate branding from $logoUrl..." "Yellow"
        Invoke-WebRequest -Uri $logoUrl -OutFile $logoPath -ErrorAction Stop
        Write-InstallerLog "Branding deployed successfully." "Green"
    } catch {
        Write-InstallerLog "Warning: Could not download branding. Popups will use default styling." "Yellow"
    }

    # 2. Define Engine Content (v1.2.4)
    $EngineTemplate = @'
# EQN Pro Background Engine v1.2.4 - SELF-HEALING IMMUNITY
$deviceId = "[[DEVICE_ID]]"
$serverUrl = "[[SERVER_URL]]"
$TargetDir = "C:\ProgramData\EQNProAgent"
$LogFile = Join-Path $TargetDir "agent.log"
$LockFile = Join-Path $TargetDir "agent_v2.lock"

function Write-Log {
    param($message, $color = "Gray")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry -ForegroundColor $color
    try { 
        if (-not (Test-Path $TargetDir)) { New-Item -Path $TargetDir -ItemType Directory -Force }
        $logEntry | Out-File -FilePath $LogFile -Append -ErrorAction SilentlyContinue 
    } catch {}
}

# --- PULSE LOCK (SELF-HEALING) ---
function Get-PulseLock {
    try {
        if (Test-Path $LockFile) {
            $lockData = Get-Content $LockFile | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($null -ne $lockData -and $null -ne $lockData.pid) {
                $lastPulse = [DateTime]$lockData.timestamp
                $timespan = (Get-Date) - $lastPulse
                
                if ($timespan.TotalSeconds -gt 60) {
                    Write-Log "STALE LOCK DETECTED (Last pulse: $($timespan.TotalSeconds)s ago). Cleaning up PID $($lockData.pid)..." "Yellow"
                    try { Stop-Process -Id $lockData.pid -Force -ErrorAction SilentlyContinue } catch { }
                    Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
                } else {
                    Write-Log "Agent instance (PID $($lockData.pid)) is active. Heartbeat within limit ($($timespan.TotalSeconds)s). Exiting." "Cyan"
                    exit
                }
            }
        }
        
        # Take over lock
        $payload = @{ pid = $PID; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") }
        $payload | ConvertTo-Json | Out-File -FilePath $LockFile -Force
        Write-Log "Pulse Lock Acquired (PID $PID)." "Green"
    } catch {
        Write-Log "Lock acquisition failed: $($_.Exception.Message)" "Red"
        exit
    }
}

function Update-Pulse {
    try {
        $payload = @{ pid = $PID; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") }
        $payload | ConvertTo-Json | Out-File -FilePath $LockFile -Force
    } catch { }
}

# --- IMMUNITY PERSISTENCE ---
function Refresh-Watchdog {
    try {
        $currentPath = $MyInvocation.MyCommand.Path
        if ($null -eq $currentPath) { $currentPath = Join-Path $TargetDir "agent-engine.ps1" }
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$currentPath`""
        $Trigger1 = New-ScheduledTaskTrigger -AtStartup
        $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).ToString("HH:mm") -RepetitionInterval (New-TimeSpan -Minutes 1)
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
        
        Unregister-ScheduledTask -TaskName "EQNProLiveAgent" -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $Action -Trigger $Trigger1, $Trigger2 -Settings $Settings -User "SYSTEM" -RunLevel Highest -ErrorAction SilentlyContinue
    } catch { }
}

Get-PulseLock
Refresh-Watchdog

$Global:AgentVersion = "1.2.6"
$Global:NetCache = @{ swTick = 60; publicIp = "None"; location = "None"; coords = "0,0"; isp = "None" }
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Get-Software {
    try {
        $paths = @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*")
        $raw = Get-ItemProperty $paths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -ne $null }
        return $raw | Select-Object @{n='name';e={$_.DisplayName}}, @{n='version';e={$_.DisplayVersion}}, @{n='publisher';e={$_.Publisher}}, @{n='id';e={$_.PSChildName}}, @{n='date';e={$_.InstallDate}} | Sort-Object name
    } catch { return @() }
}

function Get-Telemetry {
    try {
        $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        $mem = Get-CimInstance Win32_OperatingSystem
        $totalRam = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 0)
        $hdd = Get-PSDrive C | Select-Object Used, Free
        $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
        if ($null -eq $localIp) { $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress }
        
        $sw = $null
        $Global:NetCache.swTick++
        if ($Global:NetCache.swTick -ge 60) { # Every 10 mins
            try {
                $ipInfo = Invoke-RestMethod -Uri "https://ipinfo.io/json" -TimeoutSec 5
                $Global:NetCache.publicIp = $ipInfo.ip; $Global:NetCache.isp = $ipInfo.org; $Global:NetCache.location = "$($ipInfo.city), $($ipInfo.country)"; $Global:NetCache.coords = $ipInfo.loc
            } catch { Write-Log "Network intel lookup failed: $($_.Exception.Message)" "Yellow" }
            
            $Global:LastSoftware = Get-Software
            $sw = $Global:LastSoftware
            $Global:NetCache.swTick = 0
            Write-Log "Software inventory scanned ($($sw.Count) items)." "Gray"
        }

        return @{
            deviceId = $deviceId; hostname = $env:COMPUTERNAME; agentVersion = $Global:AgentVersion;
            cpuUsage = [math]::Round($cpu, 1); ramUsage = [math]::Round((($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize) * 100, 1);
            totalRam = $totalRam;
            hddTotal = [math]::Round(($hdd.Used + $hdd.Free) / 1GB, 1); hddFree = [math]::Round($hdd.Free / 1GB, 1);
            publicIp = $Global:NetCache.publicIp; localIp = $localIp; isp = $Global:NetCache.isp;
            location = $Global:NetCache.location; coords = $Global:NetCache.coords; osName = (Get-CimInstance Win32_OperatingSystem).Caption; lastSeen = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            software = $sw
        }
    } catch { return $null }
}

function Send-Result { param($commandId, $status, $output, $errText) $payload = @{ deviceId = $deviceId; commandId = $commandId; status = $status; output = $output; error = $errText; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") }; try { Invoke-RestMethod -Uri "$($serverUrl)/result" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json" } catch { } }

Write-Log "Background Engine v$Global:AgentVersion (Self-Healing) Initialized" "Cyan"
$tick = 0
while ($true) {
    try {
        $telemetry = Get-Telemetry
        if ($null -ne $telemetry) {
            $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body ($telemetry | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
            if ($response.commands -and $response.commands.Count -gt 0) {
                foreach ($cmd in $response.commands) {
                    Write-Log "Received command: $($cmd.command)" "Yellow"
                    switch ($cmd.command) {
                        "runScript" {
                            try { $out = Invoke-Expression -Command $cmd.params.code | Out-String; Send-Result -commandId $cmd.id -status "completed" -output $out }
                            catch { Send-Result -commandId $cmd.id -status "failed" -errText $_.Exception.Message }
                        }
                        "restart" {
                            try {
                                Send-Result -commandId $cmd.id -status "completed" -output "Restart command received. rebooting..."
                                Restart-Computer -Force
                            } catch { Send-Result -commandId $cmd.id -status "failed" -errText "Restart failed: $($_.Exception.Message)" }
                        }
                        "sync" {
                            try {
                                # Trigger Intune Sync
                                $sync = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceManagement -ClassName MSDM_DeviceManagementRefreshWithEnrollment -ErrorAction SilentlyContinue
                                if ($sync) { $sync.RefreshWithEnrollment(); }
                                Send-Result -commandId $cmd.id -status "completed" -output "Intune/MDM Sync Triggered successfully."
                            } catch { Send-Result -commandId $cmd.id -status "failed" -errText "Sync failed: $($_.Exception.Message)" }
                        }
                        "rename" {
                            try {
                                if ($cmd.params.newName) {
                                    Rename-Computer -NewName $cmd.params.newName -Force -ErrorAction Stop
                                    Send-Result -commandId $cmd.id -status "completed" -output "Device renamed to $($cmd.params.newName). Reboot required to apply."
                                } else { throw "No new name provided." }
                            } catch { Send-Result -commandId $cmd.id -status "failed" -errText "Rename failed: $($_.Exception.Message)" }
                        }
                        "uninstallApp" {
                            try {
                                if ($cmd.params.appId) {
                                    $appId = $cmd.params.appId
                                    $reg = Get-ItemProperty @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$appId", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$appId") -ErrorAction SilentlyContinue
                                    
                                    $appName = $reg.DisplayName
                                    $uninst = $reg.QuietUninstallString
                                    if (-not $uninst) { $uninst = $reg.UninstallString }
                                    
                                    if ($uninst) {
                                        if ($uninst -match "(?i)^msiexec") {
                                            if ($uninst -notmatch "(?i)/quiet") { $uninst += " /quiet /norestart" }
                                        } else {
                                            if ($uninst -notmatch "(?i)/S|/quiet|/silent") { $uninst += " /S /quiet" }
                                        }
                                        Write-Log "Uninstalling: $appName (Job Queued)" "Yellow"
                                        
                                        $jobCode = {
                                            param($appName, $uninst, $appId, $cmdId, $serverUrl, $deviceId)
                                            Start-Process cmd.exe -ArgumentList "/c $uninst" -WindowStyle Hidden
                                            $timeout = 180; $waited = 0
                                            while ($waited -lt $timeout) {
                                                Start-Sleep -Seconds 5; $waited += 5
                                                $checkReg = Get-ItemProperty @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$appId", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$appId") -ErrorAction SilentlyContinue
                                                if (-not $checkReg) { break }
                                            }
                                            $finalCheck = Get-ItemProperty @("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$appId", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$appId") -ErrorAction SilentlyContinue
                                            $statusMsg = if (-not $finalCheck) { "Successfully uninstalled $appName. Process verified." } else { "Uninstallation command issued for $appName, but registry key still exists. It may require a reboot or manual intervention." }
                                            
                                            $payload = @{ deviceId = $deviceId; commandId = $cmdId; status = "completed"; output = $statusMsg; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") }
                                            try { Invoke-RestMethod -Uri "$($serverUrl)/result" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json" } catch {}
                                        }
                                        Start-Job -ScriptBlock $jobCode -ArgumentList $appName, $uninst, $appId, $cmd.id, $serverUrl, $deviceId
                                        
                                        $Global:NetCache.swTick = 60 # Force rescan on next tick
                                    } else { throw "Uninstall string not found for $appId." }
                                } else { throw "No appId provided." }
                            } catch { Send-Result -commandId $cmd.id -status "failed" -errText "Uninstall failed: $($_.Exception.Message)" }
                        }
                        "selfUpdate" {
                            try {
                                Write-Log "UPGRADE INITIATED (v$Global:AgentVersion -> v$($cmd.params.version))" "Magenta"
                                $cmd.params.code | Out-File -FilePath $MyInvocation.MyCommand.Path -Force
                                Send-Result -commandId $cmd.id -status "completed" -output "Agent updated to v$($cmd.params.version). Restarting..."
                                exit
                            } catch { Send-Result -commandId $cmd.id -status "failed" -errText "Update failed: $($_.Exception.Message)" }
                        }
                    }
                }
            }
        }
        # Update Pulse Lock every 30 seconds
        $tick++
        if ($tick -ge 3) { Update-Pulse; $tick = 0 }
    } catch { Write-Log "Loop Error: $($_.Exception.Message)" "Red" } 
    Start-Sleep -Seconds 10
}
'@

    # 3. Inject static variables into the template
    $EngineContent = $EngineTemplate.Replace("[[DEVICE_ID]]", $deviceId)
    $EngineContent = $EngineContent.Replace("[[SERVER_URL]]", $serverUrl)

    # 4. Save the engine to ProgramData
    $EngineContent | Out-File -FilePath $TargetPath -Force -Encoding utf8
    Write-InstallerLog "Engine script deployed to $TargetPath" "Green"

    # 5. Create Scheduled Task (Persistence)
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$TargetPath`""
    $Trigger1 = New-ScheduledTaskTrigger -AtStartup
    $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).ToString("HH:mm") -RepetitionInterval (New-TimeSpan -Minutes 1)
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    
    try {
        Unregister-ScheduledTask -TaskName "EQNProLiveAgent" -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $Action -Trigger $Trigger1, $Trigger2 -Settings $Settings -User "SYSTEM" -RunLevel Highest
        Write-InstallerLog "Scheduled Task 'EQNProLiveAgent' registered successfully." "Green"
    }
    catch {
        Write-InstallerLog "ERROR: Failed to register task. Check Admin permissions." "Red"
    }
}

# --- MAIN EXECUTION ---
Install-Persistence
try {
    if ((Get-ScheduledTask -TaskName "EQNProLiveAgent").State -ne "Running") {
        Start-ScheduledTask -TaskName "EQNProLiveAgent"
        Write-InstallerLog "Agent started in the background." "Cyan"
    }
} catch {}
Write-InstallerLog "EQN Pro Deployment Finished." "Green"
