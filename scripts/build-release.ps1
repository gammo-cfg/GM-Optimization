[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step([string]$Message) { Write-Host "[GM] $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Fail([string]$Message) { throw $Message }

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $cargo = Join-Path $env:USERPROFILE '.cargo\bin'
    $env:Path = "$cargo;$machine;$user"
}

function Require-Command([string]$Name, [string]$Help) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail "$Name was not found. $Help"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory=$true)][string]$File,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [Parameter(Mandatory=$true)][string]$Description
    )
    Write-Step $Description
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "$Description failed (exit code $LASTEXITCODE)."
    }
}

function Get-PackageVersion {
    $pkg = Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
    return [string]$pkg.version
}

function New-CleanDirectory([string]$Path) {
    if (Test-Path $Path) { Remove-Item $Path -Recurse -Force }
    New-Item -ItemType Directory -Path $Path | Out-Null
}

try {
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host '        GM-Optimization Production Build' -ForegroundColor White
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host ''

    Refresh-ProcessPath
    Require-Command 'node.exe' 'Install Node.js LTS first.'
    Require-Command 'npm.cmd' 'Install npm with Node.js first.'
    Require-Command 'rustc.exe' 'Install Rust using rustup with the MSVC toolchain first.'
    Require-Command 'cargo.exe' 'Install Rust using rustup with the MSVC toolchain first.'

    Write-Ok ((& node.exe --version).Trim())
    Write-Ok ("npm " + (& npm.cmd --version).Trim())
    Write-Ok ((& rustc.exe --version).Trim())
    Write-Ok ((& cargo.exe --version).Trim())

    $version = Get-PackageVersion
    Write-Host "[GM] Release version: $version" -ForegroundColor Yellow

    Invoke-Checked -File 'npm.cmd' -Arguments @('ci') -Description 'Installing exact JavaScript dependencies from package-lock.json...'
    Invoke-Checked -File 'npm.cmd' -Arguments @('run','check') -Description 'Running TypeScript validation...'

    # Tauri executes beforeBuildCommand itself, so there is no need to build Vite twice.
    Invoke-Checked -File 'npm.cmd' -Arguments @('run','release:windows') -Description 'Compiling optimized Rust binary and NSIS Windows installer...'

    $targetRoot = Join-Path $ProjectRoot 'src-tauri\target\release'
    $rawExe = Join-Path $targetRoot 'gm-optimization.exe'
    if (-not (Test-Path $rawExe)) {
        Fail "The release executable was not found at $rawExe"
    }

    $nsisDir = Join-Path $targetRoot 'bundle\nsis'
    $installer = Get-ChildItem $nsisDir -Filter '*.exe' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $installer) {
        Fail "The NSIS installer was not found under $nsisDir"
    }

    $releaseDir = Join-Path $ProjectRoot 'release'
    New-CleanDirectory $releaseDir

    $portableName = "GM-Optimization-v$version-Portable-x64.exe"
    $setupName = "GM-Optimization-v$version-Setup-x64.exe"
    $portableOut = Join-Path $releaseDir $portableName
    $setupOut = Join-Path $releaseDir $setupName

    Copy-Item $rawExe $portableOut -Force
    Copy-Item $installer.FullName $setupOut -Force

    $hashes = @()
    foreach ($file in @($setupOut, $portableOut)) {
        $hash = Get-FileHash $file -Algorithm SHA256
        $hashes += "SHA256  $($hash.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($file))"
    }
    $hashes | Set-Content (Join-Path $releaseDir 'SHA256SUMS.txt') -Encoding ASCII

    $commit = 'not-a-git-checkout'
    if (Get-Command git.exe -ErrorAction SilentlyContinue) {
        try {
            $candidate = (& git.exe rev-parse --short HEAD 2>$null).Trim()
            if ($candidate) { $commit = $candidate }
        } catch { }
    }

    $buildInfo = @(
        "GM-Optimization v$version",
        "Built: $([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))",
        "Architecture: x64",
        "Installer: NSIS",
        "Rust: $((& rustc.exe --version).Trim())",
        "Node: $((& node.exe --version).Trim())",
        "Source commit: $commit",
        "Signing: unsigned unless Windows signing is configured separately"
    )
    $buildInfo | Set-Content (Join-Path $releaseDir 'BUILD_INFO.txt') -Encoding UTF8

    Write-Host ''
    Write-Ok 'Production release build completed.'
    Write-Host "[OUTPUT] Installer : $setupOut" -ForegroundColor White
    Write-Host "[OUTPUT] Portable  : $portableOut" -ForegroundColor White
    Write-Host "[OUTPUT] Hashes    : $(Join-Path $releaseDir 'SHA256SUMS.txt')" -ForegroundColor White
    Write-Host ''
    Write-Host '[NOTE] This build is ready for local/private testing.' -ForegroundColor Yellow
    Write-Host '[NOTE] For public distribution, code-sign the EXE/installer to reduce Windows SmartScreen warnings.' -ForegroundColor Yellow
    exit 0
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
