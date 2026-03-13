# EQN Pro Unified Agent - Intune Deployable
# This script handles both Installation and Execution. 
# Optimized for Microsoft Intune "Win32 App" or "PowerShell Script" deployment.

$ErrorLogLocal = Join-Path $PSScriptRoot "deploy_error.txt"
if (Test-Path $ErrorLogLocal) { Remove-Item $ErrorLogLocal -Force -ErrorAction SilentlyContinue }

# Start transcript to capture all output for debugging
$TranscriptPath = Join-Path $PSScriptRoot "deploy_transcript.log"
try { Start-Transcript -Path $TranscriptPath -Append -ErrorAction SilentlyContinue } catch {}

# Function to handle errors gracefully
function Handle-FatalError {
    param($message)
    $errorMessage = "FATAL ERROR: $message"
    Write-InstallerLog $errorMessage "Red"
    $errorMessage | Out-File -FilePath $ErrorLogLocal -Append
    try { $errorMessage | Set-Clipboard -ErrorAction SilentlyContinue } catch {}
    
    if ([Environment]::UserInteractive) {
        Write-Host "`nAn error occurred. The full log can be found at: $TranscriptPath" -ForegroundColor Cyan
        Write-Host "The error has been copied to your clipboard." -ForegroundColor Yellow
        Write-Host "Opening the error log in Notepad for you..." -ForegroundColor Gray
        Start-Process notepad.exe -ArgumentList $TranscriptPath
        Write-Host "Press any key to close..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    try { Stop-Transcript } catch {}
    exit 1
}

# 0. Check for Administrator privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $err = "CRITICAL: This script must be run as Administrator."
    $err | Out-File -FilePath $ErrorLogLocal -Force
    Write-Error $err
    exit 1
}

# --- CONFIGURATION ---
# IMPORTANT: Update this URL to match your production Vercel deployment URL!
# Example: "https://eqn-pro-demo.vercel.app/api/agent"
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent" 

$TargetDir = "C:\ProgramData\EQNProAgent"
$ScriptName = "agent-engine.ps1"
$TargetPath = Join-Path $TargetDir $ScriptName
$LogFile = Join-Path $TargetDir "agent.log"
$baseUrl = $serverUrl.Replace("/api/agent", "")
$deviceId = (Get-CimInstance Win32_BIOS).SerialNumber
$AgentVersion = "1.3.0"

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
    $agentProcs = Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like "*agent-engine.ps1*" -or $_.Name -eq "powershell.exe") -and $_.ProcessId -ne $currentPid }
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

    # 2. Define Engine Content (v1.3.0)
    $EngineTemplate = @'
# EQN Pro Background Engine v1.3.0 - RESILIENT CORE
$deviceId = "[[DEVICE_ID]]"
$serverUrl = "[[SERVER_URL]]"
$TargetDir = "C:\ProgramData\EQNProAgent"
$LogFile = Join-Path $TargetDir "agent.log"
$LockFile = Join-Path $TargetDir "agent_v3.lock"
$Version = "1.3.0"

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

# --- PULSE LOCK ---
function Get-PulseLock {
    try {
        if (Test-Path $LockFile) {
            $lockData = Get-Content $LockFile | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($null -ne $lockData -and $null -ne $lockData.pid) {
                if (Get-Process -Id $lockData.pid -ErrorAction SilentlyContinue) {
                    Write-Log "Agent PID $($lockData.pid) already active. Exiting." "Cyan"
                    exit
                }
                Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
            }
        }
        $payload = @{ pid = $PID; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") }
        $payload | ConvertTo-Json | Out-File -FilePath $LockFile -Force
        Write-Log "Pulse Lock Acquired (PID $PID)." "Green"
    } catch { exit }
}

function Refresh-Watchdog {
    try {
        $path = Join-Path $TargetDir "agent-engine.ps1"
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$path`""
        $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1).ToString("HH:mm") -RepetitionInterval (New-TimeSpan -Minutes 1)
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $Action -Trigger $Trigger -Settings $Settings -User "SYSTEM" -RunLevel Highest -Force -ErrorAction SilentlyContinue
    } catch { }
}

Get-PulseLock
Refresh-Watchdog

Write-Log "Engine v$Version Online. Targeting: $serverUrl" "Cyan"

function Send-Result { param($commandId, $status, $output, $errText) 
    $payload = @{ deviceId = $deviceId; commandId = $commandId; status = $status; output = $output; error = $errText; timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") }
    try { Invoke-RestMethod -Uri "$($serverUrl)/result" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json" } catch { } 
}

while ($true) {
    try {
        # Telemetry: Network & Resources
        $mem = Get-CimInstance Win32_OperatingSystem
        $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        $hdd = Get-PSDrive C | Select-Object Used, Free
        $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
        
        $telemetry = @{
            deviceId = $deviceId; hostname = $env:COMPUTERNAME; agentVersion = $Version;
            cpuUsage = [math]::Round($cpu, 1); ramUsage = [math]::Round((($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize) * 100, 1);
            hddTotal = [math]::Round(($hdd.Used + $hdd.Free) / 1GB, 1); hddFree = [math]::Round($hdd.Free / 1GB, 1);
            localIp = $localIp; osName = $mem.Caption; lastSeen = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); status = "online"
        }
        
        $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body ($telemetry | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 15
        if ($response.commands) {
            foreach ($cmd in $response.commands) {
                Write-Log "Executing command: $($cmd.id) ($($cmd.command))" "Yellow"
                try {
                    $out = Invoke-Expression -Command $cmd.params.code | Out-String
                    Send-Result -commandId $cmd.id -status "completed" -output $out
                } catch {
                    Send-Result -commandId $cmd.id -status "failed" -errText "Exec Error: $_"
                }
            }
        }
    } catch { Write-Log "Loop Sleep: $($_.Exception.Message)" "Red" }
    Start-Sleep -Seconds 30
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
        Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $Action -Trigger $Trigger1, $Trigger2 -Settings $Settings -User "SYSTEM" -RunLevel Highest -ErrorAction Stop
        Write-InstallerLog "Scheduled Task 'EQNProLiveAgent' registered successfully." "Green"
    }
    catch {
        $msg = "Failed to register task. Details: $($_.Exception.Message)"
        Write-InstallerLog "ERROR: $msg" "Red"
        $msg | Out-File -FilePath $ErrorLogLocal -Append
    }
}

# --- MAIN EXECUTION ---
try {
    Install-Persistence
    if ((Get-ScheduledTask -TaskName "EQNProLiveAgent").State -ne "Running") {
        Start-ScheduledTask -TaskName "EQNProLiveAgent"
        Write-InstallerLog "Agent started in the background." "Cyan"
    }
} catch {
    $_.Exception.Message | Out-File -FilePath $ErrorLogLocal -Append
    Write-InstallerLog "CRITICAL ERROR: $($_.Exception.Message)" "Red"
}

Write-InstallerLog "EQN Pro Deployment Finished." "Green"

try { Stop-Transcript } catch {}

# Pause if running interactively
if ([Environment]::UserInteractive) {
    Write-Host "`nIf you see errors above, you can check: $TranscriptPath" -ForegroundColor Cyan
    Write-Host "Press any key to close..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
