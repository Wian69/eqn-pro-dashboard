<#
.SYNOPSIS
    EQN Pro Cloud Bootstrapper v2.1.0
    Enterprise Deployment & Sync Engine

.DESCRIPTION
    This is the PERMANENT entry point for EQN Pro.
    It ensures the latest agent engine is always synced from the dashboard.
    Deploy this ONCE via Intune; all future updates happen over the air.

.VERSION 2.1.0
#>

# --- Configuration ---
$targetDir = "C:\ProgramData\EQNProAgent"
$engineFile = "agent-engine.ps1"
$targetPath = Join-Path $targetDir $engineFile
$logFile = Join-Path $targetDir "bootstrapper.log"
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent"
$downloadUrl = "$serverUrl/download"

if (!(Test-Path $targetDir)) { New-Item -Path $targetDir -ItemType Directory -Force | Out-Null }

function Write-BootLog {
    param([string]$Message)
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$stamp] $Message" | Out-File $logFile -Append
}

function Sync-AgentEngine {
    Write-BootLog "Checking for agent engine updates from $downloadUrl..."
    try {
        # Secure TLS 1.2
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        
        # Download the latest engine code
        $newCode = Invoke-RestMethod -Uri $downloadUrl -Headers @{"Cache-Control"="no-cache"} -ErrorAction Stop
        
        if ($null -ne $newCode -and $newCode.Length -gt 100) {
            # Check if current code is different (optional hash check could go here)
            $newCode | Out-File -FilePath $targetPath -Force -Encoding UTF8
            Write-BootLog "Agent engine synced successfully (v2.0+ Core)."
            return $true
        }
    } catch {
        Write-BootLog "Sync failed: $($_.Exception.Message). Running local copy if available."
    }
    return $null -ne (Test-Path $targetPath)
}

# --- Execution ---
Write-BootLog "EQN Pro Bootstrapper Awake"

# 1. Ensure we have the engine
if (!(Test-Path $targetPath) -or $args -contains "-force") {
    Write-BootLog "Force update requested. Killing existing agent processes and clearing locks..."
    
    # Kill any existing agent processes to free up file locks
    Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*agent-engine.ps1*" -or $_.CommandLine -like "*EQN-Pro-Agent*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Clear stale locks
    $lockFile = Join-Path $targetDir "agent_v2.lock"
    if (Test-Path $lockFile) { Remove-Item $lockFile -Force -ErrorAction SilentlyContinue }
    
    Sync-AgentEngine
}

# 2. Register/Update Persistence
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$targetPath`""
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).ToString("HH:mm") -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)

$existingTask = Get-ScheduledTask -TaskName "EQNProLiveAgent" -ErrorAction SilentlyContinue
if (!$existingTask) {
    Write-BootLog "Registering persistence task..."
    Register-ScheduledTask -TaskName "EQNProLiveAgent" -Action $action -Trigger $trigger1, $trigger2 -Settings $settings -User "SYSTEM" -RunLevel Highest | Out-Null
} else {
    # Update existing task logic/args if changed
    Write-BootLog "Updating existing persistence task..."
    Set-ScheduledTask -TaskName "EQNProLiveAgent" -Action $action -Trigger $trigger1, $trigger2 -Settings $settings -User "SYSTEM" -RunLevel Highest | Out-Null
}

# 3. Launch the engine (asynchronously)
if ((Get-ScheduledTask -TaskName "EQNProLiveAgent").State -ne "Running") {
    Write-BootLog "Starting Agent Engine..."
    Start-ScheduledTask -TaskName "EQNProLiveAgent"
}

Write-BootLog "Bootstrapper Finished. Agent is alive."
