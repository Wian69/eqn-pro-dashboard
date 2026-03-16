$targetPID = 4504
$bootstrapperPath = "C:\Users\WianDuRandt\.gemini\antigravity\scratch\eqn-pro\src\agent\intune-package\EQN-Pro-Deploy.ps1"

"Killing process $targetPID..." | Out-File "C:\ProgramData\EQNProAgent\cleanup.log"
Stop-Process -Id $targetPID -Force -ErrorAction SilentlyContinue

"Force-running bootstrapper..." | Out-File "C:\ProgramData\EQNProAgent\cleanup.log" -Append
powershell.exe -ExecutionPolicy Bypass -File $bootstrapperPath -force
"Cleanup complete." | Out-File "C:\ProgramData\EQNProAgent\cleanup.log" -Append
