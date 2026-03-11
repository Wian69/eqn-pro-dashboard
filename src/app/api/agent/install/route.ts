import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id') || 'UNKNOWN';
    const serverUrl = 'http://localhost:3000/api/agent'; // Update this to production URL if needed

    // This is the bootstrap one-liner template
    const script = `# EQN Pro Bootstrap Installer
$ErrorActionPreference = "Stop"
try {
    Write-Host "--- EQN Pro Bootstrap Initiated ---" -ForegroundColor Cyan
    $TargetDir = "C:\\ProgramData\\EQNProAgent"
    if (-not (Test-Path $TargetDir)) { New-Item -Path $TargetDir -ItemType Directory -Force | Out-Null }
    
    $deployUrl = "${serverUrl.replace('/api/agent', '')}/api/agent/deploy?id=${deviceId}"
    $deployPath = Join-Path $TargetDir "EQN-Pro-Deploy.ps1"
    
    Write-Host "Downloading master deployment script..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $deployUrl -OutFile $deployPath -UseBasicParsing
    
    Write-Host "Launching elevated installation..." -ForegroundColor Green
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \`"$deployPath\`"" -Verb RunAs
    
    Write-Host "Bootstrap completed. Agent will be live shortly." -ForegroundColor Cyan
} catch {
    Write-Error "Bootstrap failed: $($_.Exception.Message)"
}
`;

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
