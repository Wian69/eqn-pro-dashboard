$Path = "C:\ProgramData\EQNProAgent\agent-engine.ps1"
if (Test-Path $Path) {
    # Check for the scheduled task as well
    if (Get-ScheduledTask -TaskName "EQNProLiveAgent" -ErrorAction SilentlyContinue) {
        Write-Output "Detected"
        exit 0
    }
}
exit 1
