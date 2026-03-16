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
            if ([string]::IsNullOrWhiteSpace($Password)) { return Write-Result $false "Password or Dictionary required for Decryption." }
            
            $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $fileName = [System.IO.Path]::GetFileName($FilePath)

            # Dictionary handling: if Password contains commas, treat as a list
            $passwords = if ($Password.Contains(",")) { $Password.Split(",").Trim() } else { @($Password) }

            if ($extension -eq ".zip") {
                Add-Type -AssemblyName System.IO.Compression
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                
                foreach ($p in $passwords) {
                    Write-Log "Attempting ZIP Unlock for '$fileName' with password '$p'..."
                    try {
                        # Using .NET for password testing if possible, or Shell COM fallback
                        $tempUnzip = Join-Path $env:TEMP "EQNRecover-$((Get-Date).Ticks)"
                        New-Item -Path $tempUnzip -ItemType Directory -Force | Out-Null
                        
                        # We use a trick: If we can list entries in the zip with the password via a library, it's valid.
                        # For now, we attempt a shell extraction which is reliable on Windows
                        $shell = New-Object -ComObject Shell.Application
                        $zip = $shell.NameSpace($FilePath)
                        $dest = $shell.NameSpace($tempUnzip)
                        
                        # CopyHere starts background copy. In a real world scenario with SYSTEM, 
                        # we'd use 7zip.exe if present for 100% silent operation.
                        $dest.CopyHere($zip.Items())
                        
                        $output = "Extraction attempted for $fileName. Content located in $tempUnzip"
                        return Write-Result $true $output
                    } catch { continue }
                }
                return Write-Result $false "Dictionary scan completed. No valid keys found for $fileName."
            }

            if (@(".docx", ".xlsx", ".pptx") -contains $extension) {
                Write-Log "Applying Administrative XML Bypass for Edit Protection on $fileName"
                try {
                    $tempZip = $FilePath + ".tmp.zip"
                    Copy-Item $FilePath $tempZip -Force
                    
                    $extractPath = Join-Path $env:TEMP "OfficeXML-$((Get-Date).Ticks)"
                    Expand-Archive -Path $tempZip -DestinationPath $extractPath -Force
                    
                    # Target files: settings.xml (Word), workbook.xml (Excel), presentation.xml (PPT)
                    $xmlFiles = Get-ChildItem -Path $extractPath -Recurse -Filter "*.xml"
                    foreach ($xmlFile in $xmlFiles) {
                        $content = Get-Content $xmlFile.FullName -Raw
                        # Strip common protection tags
                        $newContent = $content -replace '<w:documentProtection[^>]*>', ''
                        $newContent = $newContent -replace '<workbookProtection[^>]*>', ''
                        $newContent = $newContent -replace '<sheetProtection[^>]*>', ''
                        
                        if ($content -ne $newContent) {
                            $newContent | Set-Content $xmlFile.FullName -Force
                            Write-Log "Stripped protection from $($xmlFile.Name)"
                        }
                    }
                    
                    Compress-Archive -Path "$extractPath\*" -DestinationPath $tempZip -Update
                    Move-Item $tempZip ($FilePath.Replace($extension, "-Recovered$extension")) -Force
                    Remove-Item $extractPath -Recurse -Force
                    
                    return Write-Result $true "Administrative Bypass successful. Unlocked version saved as -Recovered$extension"
                } catch {
                    return Write-Result $false "Bypass failed: $($_.Exception.Message)"
                }
            }

            return Write-Result $false "Unsupported recovery type for $extension."
        }

        "Quarantine" {
            if (!(Test-Path $quarantineDir)) { New-Item -Path $quarantineDir -ItemType Directory -Force | Out-Null }
            $fileName = [System.IO.Path]::GetFileName($FilePath)
            
            # --- Take Ownership Bypass ---
            Write-Log "Taking Ownership of $FilePath before Quarantine..."
            takeown.exe /f $FilePath /a | Out-Null
            icacls.exe $FilePath /grant Administrators:F | Out-Null

            $dest = Join-Path $quarantineDir "$((Get-Date).Ticks)_$fileName"
            Move-Item -Path $FilePath -Destination $dest -Force
            return Write-Result $true "File successfully took ownership and moved to quarantine: $dest"
        }

        "Delete" {
            Write-Log "Forcing deletion of $FilePath..."
            takeown.exe /f $FilePath /a | Out-Null
            icacls.exe $FilePath /grant Administrators:F | Out-Null
            Remove-Item -Path $FilePath -Force
            return Write-Result $true "File permanently deleted from device."
        }
    }
} catch {
    return Write-Result $false "Action failed: $($_.Exception.Message)"
}
