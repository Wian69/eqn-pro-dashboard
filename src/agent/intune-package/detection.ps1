$registryPath = "SOFTWARE\EQNProAgent"
$targetVersion = "2.1.2"

# Explicitly check 64-bit hive first
$baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryView]::Registry64)
$key = $baseKey.OpenSubKey($registryPath)
if ($key) {
    $version = $key.GetValue("Version")
    $key.Close()
    $baseKey.Close()
    if ($version -eq $targetVersion) {
        Write-Output "Detected v$version (64-bit hive)"
        exit 0
    }
}

# Fallback to 32-bit hive check if needed (for older installations)
$baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryView]::Registry32)
$key = $baseKey.OpenSubKey($registryPath)
if ($key) {
    $version = $key.GetValue("Version")
    $key.Close()
    $baseKey.Close()
    if ($version -eq $targetVersion) {
        Write-Output "Detected v$version (32-bit hive)"
        exit 0
    }
}

exit 1
