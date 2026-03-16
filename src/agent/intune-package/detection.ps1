$Path = "C:\ProgramData\EQNProAgent\agent-engine.ps1"
if (Test-Path $Path) {
    # Check for the scheduled task
    if (Get-ScheduledTask -TaskName "EQNProLiveAgent" -ErrorAction SilentlyContinue) {
        # Verify it's actually v2.1.0 or higher
        $content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
        if ($content -match "2.1.0") {
            Write-Output "Detected v2.1.0"
            exit 0
        }
    }
}
exit 1
