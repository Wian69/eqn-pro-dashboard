<#
.SYNOPSIS
    EQN Pro File Management & Decryption Tool v1.0
    Unlocks, Quarantines, or Deletes password-protected files.

.DESCRIPTION
    Handles admin actions for non-compliant encrypted files.
    Requires password for decryption. Supports Quarantine/Delete for unknown keys.

.PARAMETER Action
    Decrypt, Quarantine, Delete

.PARAMETER FilePath
    Full path to the target file.

.PARAMETER Password
    Required only for 'Decrypt' action.

.EXAMPLE
    .\Remove-FilePassword.ps1 -Action Decrypt -FilePath "C:\Users\Wian\Desktop\Secrets.zip" -Password "1234"
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Decrypt", "Quarantine", "Delete")]
    [string]$Action,

    [Parameter(Mandatory=$true)]
    [string]$FilePath,

    [string]$Password
)

$quarantineDir = "C:\ProgramData\EQNProAgent\Quarantine"

# --- Helper Functions ---
function Write-Result {
    param($Success, $Message)
    @{ success = $Success; message = $Message; timestamp = (Get-Date).ToString("o") } | ConvertTo-Json
}

if (!(Test-Path $FilePath)) {
    return Write-Result $false "File not found: $FilePath"
}

# --- Execution ---
try {
    switch ($Action) {
        "Decrypt" {
            if ([string]::IsNullOrWhiteSpace($Password)) { return Write-Result $false "Password required for Decryption." }
            
            $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $outPath = $FilePath.Replace($extension, "-Unlocked$extension")

            if ($extension -eq ".zip") {
                Add-Type -AssemblyName System.IO.Compression
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                
                # Note: .NET native ZipFile doesn't support passwords well. 
                # We use Shell.Application or COM for better compatibility on older hosts,
                # but for v2.1 agent we assume modern shell for unzip.
                
                $shell = New-Object -ComObject Shell.Application
                $zipFile = $shell.NameSpace($FilePath)
                $tempPath = Join-Path $env:TEMP "EQNUnzip-$((Get-Date).Ticks)"
                New-Item -Path $tempPath -ItemType Directory -Force | Out-Null
                
                # This is a fallback; in reality, PowerShell/Shell COM will prompt for password if not handled.
                # Since we are running as SYSTEM, we use simple extraction if possible.
                Write-Error "Decryption requires specialized libraries (like 7Zip or DotNetZip) for fully silent background execution. Command queued for evaluation."
                return Write-Result $false "Direct background decryption without 3rd party tools is currently limited to non-passworded items. Please install 7Zip for full support."
            }
            return Write-Result $false "Decryption logic for $extension requires Office/Acrobat COM objects to be present."
        }

        "Quarantine" {
            if (!(Test-Path $quarantineDir)) { New-Item -Path $quarantineDir -ItemType Directory -Force | Out-Null }
            $fileName = [System.IO.Path]::GetFileName($FilePath)
            $dest = Join-Path $quarantineDir "$((Get-Date).Ticks)_$fileName"
            
            Move-Item -Path $FilePath -Destination $dest -Force
            return Write-Result $true "File successfully moved to quarantine: $dest"
        }

        "Delete" {
            Remove-Item -Path $FilePath -Force
            return Write-Result $true "File permanently deleted from device."
        }
    }
} catch {
    return Write-Result $false "Action failed: $($_.Exception.Message)"
}
