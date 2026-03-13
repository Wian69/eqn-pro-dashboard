$ErrorActionPreference = "Stop"

$workspaceDir = "c:\Users\WianDuRandt\.gemini\antigravity\scratch\eqn-pro"
$agentDir = Join-Path $workspaceDir "src\agent"
$buildDir = Join-Path $workspaceDir "build"
$inputDir = Join-Path $buildDir "intune-input"
$outputDir = Join-Path $buildDir "intune-output"
$toolPath = Join-Path $buildDir "IntuneWinAppUtil.exe"
$toolUrl = "https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/raw/master/IntuneWinAppUtil.exe"

# 1. Cleanup and Prepare Directories
Write-Host "Preparing build directories..." -ForegroundColor Cyan
if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force | Out-Null }
New-Item -Path $inputDir -ItemType Directory -Force | Out-Null
New-Item -Path $outputDir -ItemType Directory -Force | Out-Null

# 17. Copy the Deployment Script (v2.1.0)
Write-Host "Copying EQN-Pro-Deploy.ps1 (v2.1.0)..." -ForegroundColor Yellow
$v2Script = Join-Path $agentDir "intune-package\EQN-Pro-Deploy.ps1"
Copy-Item -Path $v2Script -Destination (Join-Path $inputDir "EQN-Pro-Deploy.ps1") -Force

# 23. Download Microsoft Win32 Content Prep Tool
Write-Host "Downloading Microsoft IntuneWinAppUtil.exe..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $toolUrl -OutFile $toolPath -UseBasicParsing

# 27. Package the App
Write-Host "Packaging into .intunewin format..." -ForegroundColor Yellow
$processArgs = "-c `"$inputDir`" -s `"EQN-Pro-Deploy.ps1`" -o `"$outputDir`" -q"
$processParams = @{
    FilePath     = $toolPath
    ArgumentList = $processArgs
    Wait         = $true
    NoNewWindow  = $true
}
Start-Process @processParams

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Agent EQN Pro v2.1.0 Win32 Package created successfully!" -ForegroundColor Green
Write-Host "File: $outputDir\EQN-Pro-Deploy.intunewin" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Intune Portal Configuration Details:" -ForegroundColor Cyan
Write-Host "- Install Command:`tpowershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File .\EQN-Pro-Deploy.ps1"
Write-Host "- Uninstall Command:`tpowershell.exe -ExecutionPolicy Bypass -Command `"Remove-Item -Path 'C:\ProgramData\EQNProAgent' -Recurse -Force; Unregister-ScheduledTask -TaskName 'EQNProLiveAgent' -Confirm:`$false`""
Write-Host "- Detection Rule:`tFile/Folder exists -> C:\ProgramData\EQNProAgent\agent-engine.ps1"
Write-Host "- OS Architecture:`t64-bit"
Write-Host "- Minimum OS:`tWindows 10 1607"
