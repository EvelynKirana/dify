$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$EnvExampleFile = ".env.example"
$EnvFile = ".env"

function New-SecretKey {
    $bytes = New-Object byte[] 42
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes)
}

function Get-EnvValue {
    param([string]$Key)

    if (-not (Test-Path $EnvFile)) {
        return ""
    }

    $result = ""
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^\s*#" -or $line -notmatch "=") {
            continue
        }

        $parts = $line.Split("=", 2)
        if ($parts[0].Trim() -eq $Key) {
            $value = $parts[1].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $result = $value
        }
    }

    $result
}

function Set-EnvValue {
    param(
        [string]$Key,
        [string]$Value
    )

    $output = New-Object System.Collections.Generic.List[string]
    $replaced = $false

    if (Test-Path $EnvFile) {
        foreach ($line in Get-Content $EnvFile) {
            if ($line -match "^\s*#" -or $line -notmatch "=") {
                $output.Add($line)
                continue
            }

            $parts = $line.Split("=", 2)
            if ($parts[0].Trim() -eq $Key) {
                if (-not $replaced) {
                    $output.Add("$Key=$Value")
                    $replaced = $true
                }
                continue
            }

            $output.Add($line)
        }
    }

    if (-not $replaced) {
        $output.Add("$Key=$Value")
    }

    $fullPath = Join-Path $ScriptDir $EnvFile
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($fullPath, [string[]]$output, $utf8NoBom)
}

if (Test-Path $EnvFile) {
    Write-Output "Using existing $EnvFile."
}
else {
    if (-not (Test-Path $EnvExampleFile)) {
        Write-Error "$EnvExampleFile is missing."
        exit 1
    }

    Copy-Item $EnvExampleFile $EnvFile
    Write-Output "Created $EnvFile from $EnvExampleFile."
}

$currentSecretKey = Get-EnvValue "SECRET_KEY"
if ($currentSecretKey) {
    Write-Output "SECRET_KEY already exists in $EnvFile."
}
else {
    Set-EnvValue "SECRET_KEY" (New-SecretKey)
    Write-Output "Generated SECRET_KEY in $EnvFile."
}

Write-Output "Environment is ready. Run docker compose up -d to start Dify."
