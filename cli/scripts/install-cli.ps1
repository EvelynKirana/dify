#Requires -Version 5.1
<#
.SYNOPSIS
  One-line difyctl installer for Windows. Verifies sha256 before extract.
.PARAMETER Version
  Dify release tag. Defaults to the latest release.
.PARAMETER Prefix
  Install root. Defaults to $env:LOCALAPPDATA\difyctl.
.PARAMETER Repo
  Release source repo. Defaults to langgenius/dify.
#>
[CmdletBinding()]
param(
    [string]$Version = $env:DIFYCTL_VERSION,
    [string]$Prefix  = $env:DIFYCTL_PREFIX,
    [string]$Repo    = $env:DIFYCTL_REPO
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrEmpty($Version)) { $Version = 'latest' }
if ([string]::IsNullOrEmpty($Prefix))  { $Prefix  = Join-Path $env:LOCALAPPDATA 'difyctl' }
if ([string]::IsNullOrEmpty($Repo))    { $Repo    = 'langgenius/dify' }

function Fail($msg) { Write-Error "install-cli: $msg"; exit 1 }
function Need($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Fail "$cmd is required" }
}
Need tar

switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { $arch = 'x64'   }
    'ARM64' { $arch = 'arm64' }
    default { Fail "unsupported arch: $env:PROCESSOR_ARCHITECTURE" }
}
$target = "win32-$arch"

if ($Version -eq 'latest') {
    $api = "https://api.github.com/repos/$Repo/releases/latest"
} else {
    $api = "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

try {
    $release = Invoke-RestMethod -Uri $api -UseBasicParsing
} catch {
    Fail "could not fetch release metadata from $api $($_.Exception.Message)"
}

$tag = $release.tag_name
if ([string]::IsNullOrEmpty($tag)) { Fail "release has no tag_name" }

$assetRegex = "^difyctl-v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?-$target\.tar\.xz$"
$matches = @($release.assets | Where-Object { $_.name -match $assetRegex })

if ($matches.Count -eq 0) { Fail "no difyctl asset for $target on $tag" }
if ($matches.Count -gt 1) {
    $names = ($matches | ForEach-Object { $_.name }) -join ', '
    Fail "expected exactly 1 difyctl asset for $target on $tag, found $($matches.Count): $names"
}
$asset = $matches[0].name

$suffix = "-$target.tar.xz"
$cliV = $asset.Substring('difyctl-'.Length, $asset.Length - 'difyctl-'.Length - $suffix.Length)
$checksums = "difyctl-$cliV-checksums.txt"

$checksumAsset = $release.assets | Where-Object { $_.name -eq $checksums } | Select-Object -First 1
if ($null -eq $checksumAsset) {
    Fail "checksum file $checksums missing on $tag; refusing to install unverified binary"
}

$url      = "https://github.com/$Repo/releases/download/$tag/$asset"
$sumsUrl  = "https://github.com/$Repo/releases/download/$tag/$checksums"

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("difyctl-install-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$tarPath = Join-Path $tmp $asset
$sumPath = Join-Path $tmp $checksums

try {
    Write-Host "downloading $asset"
    Invoke-WebRequest -Uri $url     -OutFile $tarPath -UseBasicParsing
    Invoke-WebRequest -Uri $sumsUrl -OutFile $sumPath -UseBasicParsing

    $expected = (Get-Content $sumPath | Where-Object { $_ -match "  $([Regex]::Escape($asset))$" } | Select-Object -First 1)
    if ([string]::IsNullOrEmpty($expected)) { Fail "no checksum entry for $asset in $checksums" }
    $expectedHash = ($expected -split '\s+')[0].ToLower()
    $actualHash   = (Get-FileHash -Algorithm SHA256 -Path $tarPath).Hash.ToLower()
    if ($expectedHash -ne $actualHash) {
        Fail "checksum mismatch for $asset (expected $expectedHash, got $actualHash)"
    }

    if (Get-Command cosign -ErrorAction SilentlyContinue) {
        $sigUrl = "$url.sig"
        $pemUrl = "$url.pem"
        $sigPath = Join-Path $tmp "$asset.sig"
        $pemPath = Join-Path $tmp "$asset.pem"
        try {
            Invoke-WebRequest -Uri $sigUrl -OutFile $sigPath -UseBasicParsing
            Invoke-WebRequest -Uri $pemUrl -OutFile $pemPath -UseBasicParsing
        } catch {
            Fail "tarball signature/cert missing on $tag; refusing to install (cosign present): $($_.Exception.Message)"
        }
        $env:COSIGN_EXPERIMENTAL = '1'
        & cosign verify-blob `
            --certificate $pemPath `
            --signature   $sigPath `
            --certificate-identity-regexp '^https://github.com/langgenius/dify/' `
            --certificate-oidc-issuer     'https://token.actions.githubusercontent.com' `
            $tarPath
        if ($LASTEXITCODE -ne 0) { Fail "cosign verification failed for $asset" }
        Write-Host "cosign: verified $asset"
    } else {
        Write-Host "note: cosign not installed; skipping signature verification (sha256 still enforced)"
    }

    $shareDir = Join-Path $Prefix 'share'
    $binDir   = Join-Path $Prefix 'bin'
    New-Item -ItemType Directory -Path $shareDir -Force | Out-Null
    New-Item -ItemType Directory -Path $binDir   -Force | Out-Null

    Write-Host "extracting to $shareDir"
    & tar.exe -xJf $tarPath -C $shareDir --strip-components=1
    if ($LASTEXITCODE -ne 0) { Fail "tar.exe failed with exit $LASTEXITCODE" }

    $sourceBin = Join-Path $shareDir 'bin\difyctl.cmd'
    if (-not (Test-Path $sourceBin)) { $sourceBin = Join-Path $shareDir 'bin\difyctl.exe' }
    if (-not (Test-Path $sourceBin)) { Fail "expected binary at bin\difyctl.{cmd,exe} after extract" }

    $shimSrc = Get-Item $sourceBin
    Copy-Item -Path $sourceBin -Destination (Join-Path $binDir $shimSrc.Name) -Force
}
finally {
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
}

Write-Host ""
Write-Host "difyctl $cliV installed: $binDir"

$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($null -eq $userPath) { $userPath = '' }
if (-not ($userPath -split ';' | Where-Object { $_ -ieq $binDir })) {
    $newPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
    [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "added $binDir to user PATH (open a new terminal to pick it up)"
}
else {
    Write-Host "verify: run 'difyctl version' in a new terminal"
}
