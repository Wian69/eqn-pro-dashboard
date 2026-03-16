<#
.SYNOPSIS
    EQN Pro Agent Uninstaller
    Removes the persistence task and deletes agent files.
#>

$installDir = "C:\ProgramData\EQNProAgent"
$taskName = "EQNProAgent"

# 1. Stop and remove the Scheduled Task
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# 2. Kill any running agent processes
Get-Process -Name powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*EQN-Pro-Agent-v2.ps1*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Cleanup files
if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "EQN Pro Agent uninstalled successfully."
