[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step([string]$Message) { Write-Host "[GM] $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { throw $Message }

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $cargo = Join-Path $env:USERPROFILE '.cargo\bin'
    $gh = Join-Path $env:ProgramFiles 'GitHub CLI'
    $env:Path = "$cargo;$gh;$machine;$user"
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory=$true)][string]$File,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [Parameter(Mandatory=$true)][string]$Description
    )
    Write-Step $Description

    # Native stdout must be shown to the user, not emitted into PowerShell's
    # success pipeline. Otherwise a helper function that calls Invoke-Checked
    # can accidentally return Git/Cargo output together with its real value.
    & $File @Arguments | ForEach-Object { Write-Host $_ }
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Fail "$Description failed (exit code $exitCode)."
    }
}

function Get-PackageVersion {
    $pkgPath = Join-Path $ProjectRoot 'package.json'
    if (-not (Test-Path $pkgPath)) { Fail 'package.json was not found in the project root.' }
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $version = [string]$pkg.version
    if ([string]::IsNullOrWhiteSpace($version)) { Fail 'package.json does not contain a valid version.' }
    return $version.Trim()
}

function Ensure-GitHubCli {
    if (Get-Command gh.exe -ErrorAction SilentlyContinue) { return }

    Write-Warn 'GitHub CLI (gh) is not installed.'
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) {
        Fail 'GitHub CLI is required. Install it from https://cli.github.com/ or install winget, then run this publisher again.'
    }

    Write-Step 'Installing GitHub CLI with winget...'
    & winget.exe install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI installation failed (exit code $LASTEXITCODE)." }

    Refresh-ProcessPath
    if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
        Fail 'GitHub CLI was installed but gh.exe is not available in this terminal yet. Close this window, reopen it, and run the publisher again.'
    }
}

function Test-GitHubAuth {
    # Run through cmd.exe so an unauthenticated gh status cannot become a
    # terminating PowerShell error under Windows PowerShell 5.1.
    & cmd.exe /d /c "gh auth status --hostname github.com >nul 2>&1"
    return ($LASTEXITCODE -eq 0)
}

function Ensure-GitHubAuth {
    if (Test-GitHubAuth) {
        Write-Ok 'GitHub CLI authentication is ready.'
    } else {
        Write-Warn 'GitHub CLI is installed, but no GitHub account is connected yet.'
        Write-Host ''
        Write-Host '[GM] A GitHub sign-in will open now.' -ForegroundColor Cyan
        Write-Host '[GM] Complete the browser/device authorization, then return to this window.' -ForegroundColor DarkGray
        Write-Host ''

        # Use GitHub CLI's official browser/device flow. Request repo/workflow
        # scopes so source pushes and release publishing work for normal repos.
        & gh.exe auth login --hostname github.com --git-protocol https --web --scopes 'repo,workflow'
        if ($LASTEXITCODE -ne 0) {
            Fail 'GitHub authentication was cancelled or failed. Run the publisher again when you are ready to sign in.'
        }

        if (-not (Test-GitHubAuth)) {
            Fail 'GitHub sign-in finished, but GitHub CLI still does not report an authenticated account.'
        }

        $account = [string](& gh.exe api user --jq '.login' 2>$null)
        $account = $account.Trim()
        if ($account) {
            Write-Ok "GitHub authentication completed as $account."
        } else {
            Write-Ok 'GitHub authentication completed.'
        }
    }

    Invoke-Checked -File 'gh.exe' -Arguments @('auth','setup-git') -Description 'Configuring Git to use GitHub CLI credentials...'
}


function Normalize-GitHubRepoInput([string]$Value) {
    $v = $Value.Trim()
    if (-not $v) { return '' }
    $v = $v -replace '\\', '/'
    $v = $v -replace '^https?://github\.com/', ''
    $v = $v -replace '^git@github\.com:', ''
    $v = $v -replace '\.git$', ''
    $v = $v.Trim('/')
    if ($v -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { return '' }
    return $v
}

function Initialize-GitRepositoryFromGitHub {
    Write-Warn 'This extracted project does not contain a .git folder.'
    Write-Step 'GM can safely attach this folder to your existing GitHub repository while preserving the repository history.'

    $login = [string](& gh.exe api user --jq '.login' 2>$null)
    $login = $login.Trim()
    $candidate = ''
    if ($login) {
        $candidate = "$login/GM-Optimization"
        & gh.exe repo view $candidate --json nameWithOwner *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Detected GitHub repository: $candidate"
            $answer = Read-Host "Use ${candidate}? [Y/n]"
            if ([string]::IsNullOrWhiteSpace($answer) -or $answer.Trim().ToLowerInvariant() -eq 'y' -or $answer.Trim().ToLowerInvariant() -eq 'yes') {
                $repoName = $candidate
            }
        }
    }

    if (-not $repoName) {
        Write-Host ''
        Write-Host 'Enter the GitHub repository as OWNER/REPO or paste its GitHub URL.' -ForegroundColor White
        Write-Host 'Example: yourname/GM-Optimization' -ForegroundColor DarkGray
        $repoInput = Read-Host 'GitHub repository'
        $repoName = Normalize-GitHubRepoInput $repoInput
        if (-not $repoName) { Fail 'The GitHub repository value was not valid.' }
    }

    $resolved = [string](& gh.exe repo view $repoName --json nameWithOwner --jq '.nameWithOwner' 2>$null)
    $resolved = $resolved.Trim()
    if ($LASTEXITCODE -ne 0 -or -not $resolved) {
        Fail "GitHub repository '$repoName' was not found or your account cannot access it."
    }
    $repoName = $resolved

    $defaultBranch = [string](& gh.exe repo view $repoName --json defaultBranchRef --jq '.defaultBranchRef.name' 2>$null)
    $defaultBranch = $defaultBranch.Trim()
    if (-not $defaultBranch) { $defaultBranch = 'main' }
    $remoteUrl = "https://github.com/$repoName.git"

    Write-Host ''
    Write-Warn 'FIRST-TIME LINKING MODE'
    Write-Host "Repository : $repoName" -ForegroundColor White
    Write-Host "Branch     : $defaultBranch" -ForegroundColor White
    Write-Host "This folder will become the working copy for that repository." -ForegroundColor DarkGray
    Write-Host 'Existing GitHub history will be preserved. Files missing from this folder can be recorded as deletions.' -ForegroundColor DarkGray
    $confirm = Read-Host 'Continue and link this folder? [y/N]'
    if ($confirm.Trim().ToLowerInvariant() -ne 'y' -and $confirm.Trim().ToLowerInvariant() -ne 'yes') {
        Fail 'GitHub linking was cancelled. Nothing was changed on GitHub.'
    }

    Invoke-Checked -File 'git.exe' -Arguments @('init') -Description 'Initializing Git metadata in this project folder...'
    Invoke-Checked -File 'git.exe' -Arguments @('remote','add','origin',$remoteUrl) -Description 'Connecting this folder to the GitHub origin...'
    Invoke-Checked -File 'git.exe' -Arguments @('fetch','origin','--tags','--prune') -Description 'Downloading existing GitHub history and release tags...'

    & git.exe ls-remote --exit-code --heads origin $defaultBranch *> $null
    if ($LASTEXITCODE -eq 0) {
        # Attach HEAD/index to the existing remote commit without replacing the current working files.
        Invoke-Checked -File 'git.exe' -Arguments @('reset','--mixed',"origin/$defaultBranch") -Description 'Attaching the current files to the existing GitHub history...'
        Invoke-Checked -File 'git.exe' -Arguments @('branch','-M',$defaultBranch) -Description "Selecting release branch '$defaultBranch'..."
        Write-Ok 'Existing GitHub history is preserved and the current project files are ready to be compared against it.'
    } else {
        Invoke-Checked -File 'git.exe' -Arguments @('branch','-M',$defaultBranch) -Description "Preparing new release branch '$defaultBranch'..."
        Write-Warn 'The GitHub repository has no default branch yet. The first publication will create it.'
    }

    return $repoName
}

function Ensure-GitIdentity {
    $name = [string](& git.exe config user.name 2>$null)
    $email = [string](& git.exe config user.email 2>$null)
    $name = $name.Trim()
    $email = $email.Trim()
    if ($name -and $email) { return }

    Write-Step 'Configuring a repository-local Git identity from your authenticated GitHub account...'
    $login = [string](& gh.exe api user --jq '.login')
    $id = [string](& gh.exe api user --jq '.id')
    $login = $login.Trim()
    $id = $id.Trim()
    if (-not $login -or -not $id) { Fail 'Could not read your GitHub account identity.' }

    if (-not $name) { Invoke-Checked -File 'git.exe' -Arguments @('config','user.name',$login) -Description "Setting Git user.name to $login..." }
    if (-not $email) {
        $noreply = "$id+$login@users.noreply.github.com"
        Invoke-Checked -File 'git.exe' -Arguments @('config','user.email',$noreply) -Description 'Setting a privacy-safe GitHub noreply email...'
    }
}


function Assert-VersionConsistency([string]$Version) {
    $tauriPath = Join-Path $ProjectRoot 'src-tauri\tauri.conf.json'
    $cargoPath = Join-Path $ProjectRoot 'src-tauri\Cargo.toml'
    $lockPath = Join-Path $ProjectRoot 'package-lock.json'

    if (-not (Test-Path $tauriPath)) { Fail 'src-tauri\tauri.conf.json was not found.' }
    if (-not (Test-Path $cargoPath)) { Fail 'src-tauri\Cargo.toml was not found.' }

    $tauriVersion = [string]((Get-Content $tauriPath -Raw | ConvertFrom-Json).version)
    if ($tauriVersion -ne $Version) { Fail "Version mismatch: package.json=$Version but tauri.conf.json=$tauriVersion." }

    $cargoText = Get-Content $cargoPath -Raw
    $cargoMatch = [regex]::Match($cargoText, '(?ms)^\[package\].*?^version\s*=\s*"([^"]+)"')
    if (-not $cargoMatch.Success) { Fail 'Could not read the package version from src-tauri\Cargo.toml.' }
    $cargoVersion = $cargoMatch.Groups[1].Value
    if ($cargoVersion -ne $Version) { Fail "Version mismatch: package.json=$Version but Cargo.toml=$cargoVersion." }

    if (Test-Path $lockPath) {
        # Keep this Windows PowerShell 5.1-safe. Do not ConvertFrom-Json the
        # modern npm lockfile (it contains a packages[""] key), and do not
        # shell through `node -e` because nested quoting differs between
        # Windows PowerShell and newer PowerShell versions. The root package
        # version lives in the small JSON header before the packages map.
        $lockText = Get-Content -LiteralPath $lockPath -Raw
        $headerLength = [Math]::Min($lockText.Length, 8192)
        $lockHeader = $lockText.Substring(0, $headerLength)
        $lockMatch = [regex]::Match($lockHeader, '"version"\s*:\s*"([^"]+)"')
        if (-not $lockMatch.Success) {
            Fail 'Could not read the root version from package-lock.json.'
        }
        $lockVersion = $lockMatch.Groups[1].Value.Trim()
        if ($lockVersion -and $lockVersion -ne $Version) {
            Fail "Version mismatch: package.json=$Version but package-lock.json=$lockVersion."
        }
    }

    Write-Ok "Release version is synchronized across package.json, Tauri, Cargo, and npm lock metadata: $Version"
}

function Ensure-ReleaseIgnored {
    $gitignore = Join-Path $ProjectRoot '.gitignore'
    if (-not (Test-Path $gitignore)) { New-Item -ItemType File -Path $gitignore | Out-Null }
    $content = Get-Content $gitignore -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { $content = '' }
    $hasReleaseRule = $false
    foreach ($line in ($content -split '\r?\n')) {
        if ($line.Trim() -eq 'release/') { $hasReleaseRule = $true; break }
    }
    if (-not $hasReleaseRule) {
        Add-Content $gitignore "`r`n# Production binaries are published as GitHub Release assets.`r`nrelease/"
        Write-Ok 'Added release/ to .gitignore.'
    }
}

function Get-ReleaseAssets([string]$Version) {
    $releaseDir = Join-Path $ProjectRoot 'release'
    $required = @(
        (Join-Path $releaseDir "GM-Optimization-v$Version-Setup-x64.exe"),
        (Join-Path $releaseDir "GM-Optimization-v$Version-Portable-x64.exe"),
        (Join-Path $releaseDir 'SHA256SUMS.txt')
    )

    foreach ($path in $required) {
        if (-not (Test-Path $path -PathType Leaf)) { Fail "Required release asset is missing: $path" }
    }

    $buildInfo = Join-Path $releaseDir 'BUILD_INFO.txt'
    if (Test-Path $buildInfo -PathType Leaf) { $required += $buildInfo }
    return $required
}

function New-ReleaseNotes([string]$Version, [string]$Tag) {
    $releaseDir = Join-Path $ProjectRoot 'release'
    $notesPath = Join-Path $releaseDir 'GITHUB_RELEASE_NOTES.md'

    $allTags = @(& git.exe tag --sort=-version:refname)
    $previousTag = $allTags | Where-Object { $_ -and $_ -ne $Tag } | Select-Object -First 1

    if ($previousTag) {
        $changes = @(& git.exe log --pretty=format:'- %s (`%h`)' "$previousTag..HEAD")
    } else {
        $changes = @(& git.exe log -n 20 --pretty=format:'- %s (`%h`)')
    }

    if (-not $changes -or $changes.Count -eq 0) { $changes = @('- Production release build.') }

    $lines = @(
        "# GM-Optimization v$Version",
        '',
        'Windows x64 production release.',
        '',
        '## Downloads',
        '',
        "- **GM-Optimization-v$Version-Setup-x64.exe** - recommended installer",
        "- **GM-Optimization-v$Version-Portable-x64.exe** - portable build",
        '- **SHA256SUMS.txt** - SHA-256 checksums',
        '',
        '## Changes',
        ''
    ) + $changes + @(
        '',
        '## Requirements',
        '',
        '- Windows 10/11 x64',
        '- Administrator privileges are recommended for system-level optimization features.',
        '',
        '> This build may be unsigned. Windows SmartScreen can show an Unknown Publisher warning until code signing is configured.'
    )

    $lines | Set-Content $notesPath -Encoding UTF8
    return $notesPath
}

try {
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host '      GM-Optimization GitHub Release Publisher' -ForegroundColor White
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Host ''

    Refresh-ProcessPath

    if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
        Fail 'Git is not installed or is not on PATH. Install Git for Windows, then run this publisher again.'
    }

    Ensure-GitHubCli
    Ensure-GitHubAuth

    $bootstrappedRepo = ''
    $wasBootstrapped = $false
    if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
        $bootstrappedRepo = Initialize-GitRepositoryFromGitHub
        $wasBootstrapped = $true
    }

    $origin = [string](& git.exe remote get-url origin 2>$null)
    $origin = $origin.Trim()
    if (-not $origin) { Fail 'No Git remote named origin is configured.' }
    Write-Ok "Git origin: $origin"

    $branch = [string](& git.exe branch --show-current)
    $branch = $branch.Trim()
    if (-not $branch) { Fail 'You are currently on a detached HEAD. Checkout your normal release branch first.' }
    Write-Ok "Current branch: $branch"

    Ensure-GitIdentity
    Ensure-ReleaseIgnored

    if ($bootstrappedRepo) {
        $repoName = $bootstrappedRepo
    } else {
        $repoName = [string](& gh.exe repo view --json nameWithOwner --jq '.nameWithOwner' 2>$null)
        $repoName = $repoName.Trim()
        if ($LASTEXITCODE -ne 0 -or -not $repoName) {
            Fail 'The origin remote could not be resolved as a GitHub repository.'
        }
    }
    Write-Ok "GitHub repository: $repoName"

    $version = Get-PackageVersion
    Assert-VersionConsistency $version
    $tag = "v$version"
    $title = "GM-Optimization v$version"
    Write-Host "[GM] Version: $version" -ForegroundColor Yellow
    Write-Host "[GM] Tag    : $tag" -ForegroundColor Yellow

    Invoke-Checked -File 'git.exe' -Arguments @('fetch','origin','--tags','--prune') -Description 'Fetching the latest GitHub branch and tags...'

    & git.exe ls-remote --exit-code --heads origin $branch *> $null
    if ($LASTEXITCODE -eq 0) {
        if ($wasBootstrapped) {
            Write-Ok "First-time linking already synchronized with origin/$branch."
        } else {
            Invoke-Checked -File 'git.exe' -Arguments @('pull','--rebase','--autostash','origin',$branch) -Description "Updating local $branch from GitHub before publishing..."
        }
    } else {
        Write-Warn "Remote branch '$branch' does not exist yet; it will be created on the first push."
    }

    Invoke-Checked -File 'git.exe' -Arguments @('add','-A') -Description 'Staging all new, modified, renamed, and deleted source files...'
    $pending = @(& git.exe status --porcelain)
    if ($pending.Count -gt 0) {
        Invoke-Checked -File 'git.exe' -Arguments @('commit','-m',"Release $tag") -Description "Creating release commit 'Release $tag'..."
    } else {
        Write-Ok 'No uncommitted source changes; current commit will be released.'
    }

    $head = [string](& git.exe rev-parse HEAD)
    $head = $head.Trim()
    if (-not $head) { Fail 'Could not determine the current Git commit.' }
    Write-Ok "Release commit: $($head.Substring(0, [Math]::Min(12, $head.Length)))"

    # A version tag is immutable in this workflow. If it already points elsewhere,
    # require a version bump instead of force-moving a public release tag.
    & git.exe show-ref --tags --verify --quiet "refs/tags/$tag"
    if ($LASTEXITCODE -eq 0) {
        $tagCommit = [string](& git.exe rev-list -n 1 $tag)
        $tagCommit = $tagCommit.Trim()
        if ($tagCommit -ne $head) {
            Fail "$tag already exists and points to a different commit. Bump the version in package.json/Tauri/Cargo before publishing a new release. Public release tags are never force-moved by this script."
        }
        Write-Ok "$tag already points to this release commit."
    }

    if (-not $SkipBuild) {
        $buildScript = Join-Path $ProjectRoot 'scripts\build-release.ps1'
        if (-not (Test-Path $buildScript)) { Fail 'scripts\build-release.ps1 was not found.' }
        Invoke-Checked -File 'powershell.exe' -Arguments @('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',$buildScript) -Description 'Building the production Windows release before pushing anything...'
    } else {
        Write-Warn 'Skipping the production build because -SkipBuild was supplied.'
    }

    $assets = Get-ReleaseAssets $version
    $notesPath = New-ReleaseNotes -Version $version -Tag $tag

    # The build passed. Only now mutate the remote repository.
    Invoke-Checked -File 'git.exe' -Arguments @('push','-u','origin',$branch) -Description "Pushing all source changes to GitHub branch '$branch'..."

    & git.exe show-ref --tags --verify --quiet "refs/tags/$tag"
    if ($LASTEXITCODE -ne 0) {
        Invoke-Checked -File 'git.exe' -Arguments @('tag','-a',$tag,'-m',"GM-Optimization $tag") -Description "Creating annotated tag $tag..."
    }

    Invoke-Checked -File 'git.exe' -Arguments @('push','origin',$tag) -Description "Pushing release tag $tag to GitHub..."

    & gh.exe release view $tag --repo $repoName *> $null
    $releaseExists = ($LASTEXITCODE -eq 0)

    if ($releaseExists) {
        Write-Ok "GitHub Release $tag already exists. It is left unchanged so a published version remains an immutable snapshot."
    } else {
        $createArgs = @('release','create',$tag) + $assets + @('--verify-tag','--title',$title,'--notes-file',$notesPath,'--latest','--repo',$repoName)
        Invoke-Checked -File 'gh.exe' -Arguments $createArgs -Description 'Creating GitHub Release and uploading Windows binaries...'
    }

    $releaseUrl = [string](& gh.exe release view $tag --repo $repoName --json url --jq '.url')
    $releaseUrl = $releaseUrl.Trim()

    Write-Host ''
    Write-Ok 'GitHub publication completed.'
    Write-Host "[SOURCE]  $repoName / $branch" -ForegroundColor White
    Write-Host "[TAG]     $tag" -ForegroundColor White
    if ($releaseUrl) { Write-Host "[RELEASE] $releaseUrl" -ForegroundColor White }
    Write-Host ''
    Write-Host '[GM] Future workflow: update the project version, make your changes, then run PUBLISH_GITHUB_RELEASE.bat.' -ForegroundColor Cyan
    exit 0
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '[GM] The publisher stops on errors and never force-moves an existing release tag.' -ForegroundColor DarkGray
    exit 1
}
