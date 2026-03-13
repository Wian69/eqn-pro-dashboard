# EQN Pro Agent Diagnostic Tool
# Run this on a device where the agent is installed but not showing in the dashboard.

$TargetDir = "C:\ProgramData\EQNProAgent"
$EnginePath = Join-Path $TargetDir "agent-engine.ps1"
$LogPath = Join-Path $TargetDir "agent.log"

Write-Host "--- EQN Pro Agent Diagnostics ---" -ForegroundColor Cyan

# 1. Check Directory
if (Test-Path $TargetDir) {
    Write-Host "[OK] Agent directory exists: $TargetDir" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Agent directory NOT found: $TargetDir" -ForegroundColor Red
    exit
}

# 2. Check Engine Script
if (Test-Path $EnginePath) {
    Write-Host "[OK] Engine script found: $EnginePath" -ForegroundColor Green
    $content = Get-Content $EnginePath
    $serverUrl = ($content | Select-String "\$serverUrl = `"(.*?)`"").Matches.Groups[1].Value
    $deviceId = ($content | Select-String "\$deviceId = `"(.*?)`"").Matches.Groups[1].Value
    
    Write-Host "  > Server URL: $serverUrl" -ForegroundColor Gray
    Write-Host "  > Device ID:  $deviceId" -ForegroundColor Gray
    
    if ($serverUrl -like "*localhost*") {
        Write-Host "  [!] WARNING: Agent is targeting 'localhost'. It will NEVER show in the dashboard." -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAIL] Engine script NOT found." -ForegroundColor Red
}

# 3. Check Scheduled Task
$task = Get-ScheduledTask -TaskName "EQNProLiveAgent" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "[OK] Scheduled Task 'EQNProLiveAgent' is registered." -ForegroundColor Green
    Write-Host "  > Current State: $($task.State)" -ForegroundColor Gray
} else {
    Write-Host "[FAIL] Scheduled Task 'EQNProLiveAgent' is NOT registered." -ForegroundColor Red
}

# 4. Test Connectivity
Write-Host "[...] Testing connectivity to $serverUrl..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-RestMethod -Uri $serverUrl -Method Post -Body (@{ deviceId = "diag-test"; status = "diagnostic" } | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    Write-Host "[OK] Successfully communicated with the dashboard API." -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Could NOT reach the dashboard API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "--- Diagnostics Complete ---" -ForegroundColor Cyan
Write-Host "If the Server URL is wrong, please redeploy using the dashboard button." -ForegroundColor Yellow
