# EQN Pro Agent Advanced Diagnostic Tool v2.1
$TargetDir = "C:\ProgramData\EQNProAgent"
$EnginePath = Join-Path $TargetDir "agent-engine.ps1"
$LogPath = Join-Path $TargetDir "agent.log"
$BootLog = Join-Path $TargetDir "bootstrapper.log"

Write-Host "`n--- EQN Pro Advanced Diagnostics ---" -ForegroundColor Cyan

function Check-File {
    param($path, $name)
    if (Test-Path $path) {
        Write-Host "[OK] $name found: $path" -ForegroundColor Green
        return $true
    }
    Write-Host "[FAIL] $name NOT found: $path" -ForegroundColor Red
    return $false
}

# 1. Directory & Files
$dirExists = Check-File $TargetDir "Agent Directory"
$engineExists = Check-File $EnginePath "Engine Script"

# 2. Extract Data
if ($engineExists) {
    $content = Get-Content $EnginePath -Raw
    if ($content -match '\$serverUrl = "(.*?)"') { 
        $serverUrl = $matches[1]
        Write-Host "  > Target URL: $serverUrl" -ForegroundColor Gray
    }
    if ($content -match '\$deviceId = "(.*?)"') { 
        $deviceId = $matches[1]
        Write-Host "  > Agent ID:   $deviceId" -ForegroundColor Gray
    }
}

# 3. Scheduled Task
$task = Get-ScheduledTask -TaskName "EQNProLiveAgent" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "[OK] Scheduled Task 'EQNProLiveAgent' is registered." -ForegroundColor Green
    Write-Host "  > State: $($task.State)" -ForegroundColor Gray
} else {
    Write-Host "[FAIL] Scheduled Task is MISSING." -ForegroundColor Red
}

# 4. Engine Logs
if (Test-Path $LogPath) {
    Write-Host "[LOG] Recent Agent Activity (Last 5 lines):" -ForegroundColor Yellow
    Get-Content $LogPath -Tail 5 | ForEach-Object { Write-Host "  $ _" -ForegroundColor Gray }
}

# 5. Connectivity Test
if ($serverUrl) {
    Write-Host "[...] Testing connectivity to $serverUrl..." -ForegroundColor Yellow
    try {
        $body = @{ deviceId = "diag-test-$env:COMPUTERNAME"; status = "diagnostic" } | ConvertTo-Json
        $testResponse = Invoke-RestMethod -Uri $serverUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host "[OK] Successfully reached Dashboard API." -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] Connectivity Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Message -like "*proxy*") { Write-Host "  [!] Proxy detected and blocking traffic." -ForegroundColor Yellow }
    }
}

# 6. Process Check
$proc = Get-Process -Name powershell* | Where-Object { $_.CommandLine -like "*agent-engine.ps1*" } -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "[OK] Agent Process is running (PID: $($proc.Id))." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Agent Process is NOT running." -ForegroundColor Red
}

Write-Host "`n--- Diagnostic Complete ---" -ForegroundColor Cyan
