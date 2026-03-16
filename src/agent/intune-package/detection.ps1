$registryPath = "HKLM:\SOFTWARE\EQNProAgent"
if (Test-Path $registryPath) {
    $version = Get-ItemProperty -Path $registryPath -Name "Version" -ErrorAction SilentlyContinue
    if ($version.Version -eq "2.1.1") {
        Write-Output "Detected v2.1.1"
        exit 0
    }
}
exit 1
