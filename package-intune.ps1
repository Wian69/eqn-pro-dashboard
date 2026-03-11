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

# 2. Copy the Deployment Script
Write-Host "Copying EQN-Pro-Deploy.ps1..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $agentDir "EQN-Pro-Deploy.ps1") -Destination $inputDir -Force

# 3. Download Microsoft Win32 Content Prep Tool
Write-Host "Downloading Microsoft IntuneWinAppUtil.exe..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $toolUrl -OutFile $toolPath -UseBasicParsing

# 4. Package the App
Write-Host "Packaging into .intunewin format..." -ForegroundColor Yellow
$processArgs = "-c `"$inputDir`" -s `"$inputDir\EQN-Pro-Deploy.ps1`" -o `"$outputDir`" -q"
$processParams = @{
    FilePath     = $toolPath
    ArgumentList = $processArgs
    Wait         = $true
    NoNewWindow  = $true
}
Start-Process @processParams

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Win32 Package created successfully!" -ForegroundColor Green
Write-Host "File located at: $outputDir\EQN-Pro-Deploy.intunewin" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Intune Configuration Details:" -ForegroundColor Cyan
Write-Host "- Install Command:`tpowershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File .\EQN-Pro-Deploy.ps1"
Write-Host "- Uninstall Command:`tpowershell.exe -ExecutionPolicy Bypass -Command `"Remove-Item -Path 'C:\ProgramData\EQNProAgent' -Recurse -Force; Unregister-ScheduledTask -TaskName 'EQNProLiveAgent' -Confirm:`$false`""
Write-Host "- Detection Rule:`tFile/Folder exists -> C:\ProgramData\EQNProAgent\agent-engine.ps1"
