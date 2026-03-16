
# EQN Pro Connectivity Test Script
$serverUrl = "https://eqn-pro-dashboard.vercel.app/api/agent"

Write-Host "--- EQN Pro Cloud Connectivity Test ---" -ForegroundColor Cyan
Write-Host "Testing connection to: $serverUrl"

try {
    Write-Host "1. Testing Basic Reachability..." -NoNewline
    $test = Test-NetConnection -ComputerName "eqn-pro-dashboard.vercel.app" -Port 443
    if ($test.TcpTestSucceeded) { 
        Write-Host " [SUCCESS]" -ForegroundColor Green 
    } else { 
        Write-Host " [FAILED]" -ForegroundColor Red 
    }

    Write-Host "2. Testing API Handshake..." -NoNewline
    $payload = @{
        deviceId = "CONN-TEST-$(Get-Random)"
        hostname = "DIAGNOSTIC-RUN"
        test = $true
    }
    $res = Invoke-RestMethod -Uri $serverUrl -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
    Write-Host " [SUCCESS]" -ForegroundColor Green
    Write-Host "Server Response: $($res.status)"
} catch {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Message)"
}
Write-Host "---------------------------------------"
