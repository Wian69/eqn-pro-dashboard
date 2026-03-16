<#
.SYNOPSIS
    EQN Pro Agent Installer - Win32 App Wrapper
    Sets up the agent as a persistent system service via Scheduled Task.
#>

$installDir = "C:\ProgramData\EQNProAgent"
$scriptName = "EQN-Pro-Agent-v2.ps1"
$taskName = "EQNProAgent"

# 1. Create installation directory
if (!(Test-Path $installDir)) {
    New-Item -Path $installDir -ItemType Directory -Force | Out-Null
}

# 2. Copy the agent script to the persistent location
$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$sourceScript = Join-Path $currentDir $scriptName
$targetScript = Join-Path $installDir $scriptName

if (Test-Path $sourceScript) {
    Copy-Item -Path $sourceScript -Destination $targetScript -Force
} else {
    Write-Error "Agent script not found in packaging source: $sourceScript"
    exit 1
}

# 3. Create/Update the Scheduled Task
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$targetScript`""
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$trigger = New-ScheduledTaskTrigger -AtStartup

# Define settings for retry and persistence
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

# Register the task
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Trigger $trigger -Settings $settings -Force | Out-Null

# 4. Start the task immediately
Start-ScheduledTask -TaskName $taskName

Write-Host "EQN Pro Agent installed and started successfully."
