<#
.SYNOPSIS
    EQN Pro File Encryption Auditor v1.0
    Scans for password-protected files across user profiles.

.DESCRIPTION
    Detects encryption in ZIP, PDF, and Microsoft Office documents.
    Supports targeted user scans or machine-wide audits.

.PARAMETER Username
    Specific user profile to scan (e.g. "JohnDoe"). If omitted, scans all profiles.

.EXAMPLE
    .\Check-FileEncryption.ps1 -Username "Wian"
#>

param(
    [string]$Username,
    [string]$RootPath = "C:\Users"
)

$results = @()

# 1. Determine Scan Path
$scanPaths = @()
if ($Username) {
    $userPath = Join-Path $RootPath $Username
    if (Test-Path $userPath) {
        $scanPaths += Join-Path $userPath "Documents"
        $scanPaths += Join-Path $userPath "Downloads"
        $scanPaths += Join-Path $userPath "Desktop"
    } else {
        Write-Error "User profile for '$Username' not found."
        return
    }
} else {
    # Scan all user profiles (Documents/Downloads/Desktop)
    Get-ChildItem $RootPath -Directory | ForEach-Object {
        $scanPaths += Join-Path $_.FullName "Documents"
        $scanPaths += Join-Path $_.FullName "Downloads"
        $scanPaths += Join-Path $_.FullName "Desktop"
    }
}

# 2. File Signature Analysis Functions
function Test-ZipEncrypted {
    param([string]$Path)
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        $buffer = New-Object byte[] 8
        $stream.Read($buffer, 0, 8) | Out-Null
        $stream.Close()
        
        # ZIP Signature: 0x50 0x4B 0x03 0x04
        # Bit 0 of Byte 6 (General Purpose Bit Flag) indicates encryption
        if ($buffer[0] -eq 0x50 -and $buffer[1] -eq 0x4B) {
            return ($buffer[6] -band 0x01) -eq 0x01
        }
    } catch {}
    return $false
}

function Test-PdfEncrypted {
    param([string]$Path)
    try {
        # PDF encryption usually shows up as /Encrypt in the file content
        # We check the last 4KB where the trailer/encryption dictionary usually lives
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $content = [System.Text.Encoding]::ASCII.GetString($bytes)
        return $content.Contains("/Encrypt")
    } catch {}
    return $false
}

function Test-OfficeEncrypted {
    param([string]$Path)
    try {
        # Modern Office (OpenXML) are ZIPs. If the ZIP itself isn't encrypted, 
        # look for 'encryptionInfo' stream inside.
        # Legacy Office (OLE2) has specific headers.
        $stream = [System.IO.File]::OpenRead($Path)
        $buffer = New-Object byte[] 8
        $stream.Read($buffer, 0, 8) | Out-Null
        $stream.Close()

        # OLE2 Signature: D0 CF 11 E0 A1 B1 1A E1
        if ($buffer[0] -eq 0xD0 -and $buffer[1] -eq 0xCF) {
            return $true # High probability of protection in OLE2 if identified
        }
        
        # OpenXML (ZIP) check
        if ($buffer[0] -eq 0x50 -and $buffer[1] -eq 0x4B) {
            # Check for [Content_Types].xml - if it contains 'encrypted'
            $content = [System.IO.File]::ReadAllText($Path)
            return $content.Contains("Encrypted") -or $content.Contains("Encryption")
        }
    } catch {}
    return $false
}

# 3. Main Scan Loop
foreach ($path in $scanPaths) {
    if (!(Test-Path $path)) { continue }
    
    Get-ChildItem -Path $path -File -Recurse -Include "*.zip", "*.pdf", "*.docx", "*.xlsx", "*.pptx", "*.doc", "*.xls" -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_
        $extension = $file.Extension.ToLower()
        $isEncrypted = $false
        $type = "Unknown"

        switch ($extension) {
            ".zip" { 
                $type = "ZIP Archive"
                if (Test-ZipEncrypted $file.FullName) { $isEncrypted = $true }
            }
            ".pdf" {
                $type = "PDF Document"
                if (Test-PdfEncrypted $file.FullName) { $isEncrypted = $true }
            }
            { @(".docx", ".xlsx", ".pptx", ".doc", ".xls") -contains $_ } {
                $type = "Office Document"
                if (Test-OfficeEncrypted $file.FullName) { $isEncrypted = $true }
            }
        }

        if ($isEncrypted) {
            $results += [PSCustomObject]@{
                FileName = $file.Name
                SizeMB   = [math]::Round($file.Length / 1MB, 2)
                Path     = $file.FullName
                Type     = $type
                Owner    = $file.Directory.Parent.Name # Assumptions for profile scans
                LastModified = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    }
}

# 4. Output Results
if ($results.Count -gt 0) {
    $results | ConvertTo-Json
} else {
    Write-Output "[]"
}
