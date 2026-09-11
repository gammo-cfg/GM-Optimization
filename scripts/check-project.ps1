[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$user = [Environment]::GetEnvironmentVariable('Path', 'User')
$env:Path = "$(Join-Path $env:USERPROFILE '.cargo\bin');$machine;$user"

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. Run START_GM_OPTIMIZATION.bat first."
    }
}

try {
    Require-Command 'node.exe'
    Require-Command 'npm.cmd'
    Require-Command 'cargo.exe'

    if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules\.package-lock.json'))) {
        Write-Host '[GM] Installing JavaScript dependencies...'
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    }

    Write-Host '[1/3] TypeScript check...'
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed.' }

    Write-Host '[2/3] Frontend production build...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend production build failed.' }

    Write-Host '[3/3] Rust backend check...'
    & cargo.exe check --manifest-path (Join-Path $ProjectRoot 'src-tauri\Cargo.toml')
    if ($LASTEXITCODE -ne 0) { throw 'Rust backend check failed.' }

    Write-Host ''
    Write-Host '[OK] Frontend and Rust checks completed successfully.' -ForegroundColor Green
    exit 0
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
