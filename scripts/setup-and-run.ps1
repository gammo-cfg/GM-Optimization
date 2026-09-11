[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step([string]$Message) {
    Write-Host "[GM] $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $extra = Join-Path $env:USERPROFILE '.cargo\bin'
    $env:Path = "$extra;$machine;$user"
}

function Require-Winget {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw 'Windows Package Manager (winget) is required. Install or update "App Installer" from Microsoft Store, then run this launcher again.'
    }
}

function Install-WingetPackage {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [string[]]$ExtraArguments = @()
    )

    $args = @(
        'install', '--id', $Id, '-e', '--source', 'winget',
        '--accept-source-agreements', '--accept-package-agreements',
        '--disable-interactivity'
    ) + $ExtraArguments

    & winget.exe @args
    if ($LASTEXITCODE -ne 0) {
        throw "winget could not install $Id (exit code $LASTEXITCODE)."
    }
}

function Ensure-Node {
    Refresh-ProcessPath
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        Write-Step 'Node.js LTS was not found. Installing it...'
        Install-WingetPackage -Id 'OpenJS.NodeJS.LTS'
        Refresh-ProcessPath
    }

    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js/npm is still unavailable after installation. Restart Windows and run this launcher again.'
    }

    $nodeVersion = (& node.exe --version).Trim()
    $npmVersion = (& npm.cmd --version).Trim()
    Write-Ok "Node.js $nodeVersion"
    Write-Ok "npm $npmVersion"
}

function Ensure-Rust {
    Refresh-ProcessPath
    if (-not (Get-Command cargo.exe -ErrorAction SilentlyContinue)) {
        Write-Step 'Rust/Cargo was not found. Installing rustup...'
        Install-WingetPackage -Id 'Rustlang.Rustup'
        Refresh-ProcessPath
    }

    if (-not (Get-Command rustup.exe -ErrorAction SilentlyContinue)) {
        $rustup = Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe'
        if (Test-Path $rustup) {
            $env:Path = "$(Split-Path $rustup -Parent);$env:Path"
        }
    }

    if (-not (Get-Command rustup.exe -ErrorAction SilentlyContinue)) {
        throw 'rustup is not available after installation. Restart Windows and run this launcher again.'
    }

    Write-Step 'Selecting/updating the stable MSVC Rust toolchain...'
    & rustup.exe default stable-msvc
    if ($LASTEXITCODE -ne 0) {
        throw "rustup could not select stable-msvc (exit code $LASTEXITCODE)."
    }

    Refresh-ProcessPath
    if (-not (Get-Command cargo.exe -ErrorAction SilentlyContinue) -or -not (Get-Command rustc.exe -ErrorAction SilentlyContinue)) {
        throw 'Cargo/rustc is still unavailable. Restart Windows and run this launcher again.'
    }

    Write-Ok ((& rustc.exe --version).Trim())
    Write-Ok ((& cargo.exe --version).Trim())
}

function Find-VsCppInstallation {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path $vswhere)) {
        return $null
    }

    $result = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($LASTEXITCODE -eq 0 -and $result) {
        return ($result | Select-Object -First 1).Trim()
    }
    return $null
}

function Ensure-CppBuildTools {
    $installation = Find-VsCppInstallation
    if ($installation) {
        Write-Ok "Microsoft C++ build tools: $installation"
        return
    }

    Write-Step 'Microsoft C++ build tools were not detected.'
    Write-Step 'Installing Visual Studio Build Tools with Desktop C++ support. This can take several minutes and several GB.'

    Install-WingetPackage -Id 'Microsoft.VisualStudio.2022.BuildTools' -ExtraArguments @(
        '--override', '--passive --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    )

    Start-Sleep -Seconds 2
    $installation = Find-VsCppInstallation
    if (-not $installation) {
        throw 'The C++ workload is not visible yet. Restart Windows, then run START_GM_OPTIMIZATION.bat again. If needed, open Visual Studio Installer and enable "Desktop development with C++".'
    }

    Write-Ok "Microsoft C++ build tools: $installation"
}

function Ensure-Dependencies {
    $npmLock = Join-Path $ProjectRoot 'node_modules\.package-lock.json'
    if (-not (Test-Path $npmLock)) {
        Write-Step 'Installing JavaScript dependencies with npm ci...'
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed (exit code $LASTEXITCODE)."
        }
    }
    else {
        Write-Ok 'JavaScript dependencies are already installed.'
    }
}

function Get-ListeningProcessForPort {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    $results = @()
    foreach ($connection in $connections) {
        $ownerPid = [int]$connection.OwningProcess
        if ($ownerPid -le 0 -or $ownerPid -eq $PID) { continue }

        $process = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
        $results += [PSCustomObject]@{
            Port = $Port
            Pid = $ownerPid
            Name = if ($process) { $process.ProcessName } else { 'unknown' }
            CommandLine = if ($cim) { [string]$cim.CommandLine } else { '' }
        }
    }
    return $results
}

function Clear-GmDevPorts {
    $ports = @(1420, 1421)
    $stopped = New-Object System.Collections.Generic.HashSet[int]

    foreach ($port in $ports) {
        foreach ($listener in @(Get-ListeningProcessForPort -Port $port)) {
            if ($stopped.Contains($listener.Pid)) { continue }

            $command = [string]$listener.CommandLine
            $name = [string]$listener.Name
            $looksLikeNode = $name -ieq 'node' -or $name -ieq 'node.exe'
            $looksLikeGmDev = $command -match '(?i)(vite|tauri\s+dev|GM-Optimization|node_modules[\\/]vite)'

            if ($looksLikeNode -and $looksLikeGmDev) {
                Write-Step "Stopping stale GM/Vite dev process PID $($listener.Pid) using port $port..."
                Stop-Process -Id $listener.Pid -Force -ErrorAction Stop
                [void]$stopped.Add($listener.Pid)
            }
            else {
                $display = if ($command) { $command } else { $name }
                throw "Development port $port is already being used by PID $($listener.Pid) ($display). Close that application or change the GM development ports before launching."
            }
        }
    }

    if ($stopped.Count -gt 0) {
        Start-Sleep -Milliseconds 900
    }

    foreach ($port in $ports) {
        $remaining = @(Get-ListeningProcessForPort -Port $port)
        if ($remaining.Count -gt 0) {
            $listener = $remaining[0]
            throw "Development port $port is still occupied by PID $($listener.Pid) ($($listener.Name))."
        }
    }

    Write-Ok 'GM development ports 1420/1421 are available.'
}

try {
    Clear-Host
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host '            GM-Optimization v0.4.2' -ForegroundColor White
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host ''

    Require-Winget
    Ensure-Node
    Ensure-Rust
    Ensure-CppBuildTools
    Ensure-Dependencies

    Write-Step 'Running TypeScript validation...'
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) {
        throw "TypeScript validation failed (exit code $LASTEXITCODE)."
    }
    Write-Ok 'TypeScript validation passed.'

    Write-Step 'Building frontend preflight bundle...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend production build failed (exit code $LASTEXITCODE)."
    }
    Write-Ok 'Frontend production build passed.'

    Write-Step 'Checking GM development ports...'
    Clear-GmDevPorts

    Write-Host ''
    Write-Step 'Starting GM-Optimization in Tauri development mode...'
    Write-Host 'Keep this terminal open while testing.' -ForegroundColor DarkGray
    Write-Host ''

    & npm.cmd run tauri:dev
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri development launch failed (exit code $LASTEXITCODE)."
    }

    exit 0
}
catch {
    Write-Host ''
    Write-Host '[ERROR] GM-Optimization could not be prepared or started.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'Send the FIRST compiler/error block shown above if you need me to fix the next issue.' -ForegroundColor Yellow
    exit 1
}
