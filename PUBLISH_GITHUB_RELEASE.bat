@echo off
setlocal
cd /d "%~dp0"
title GM-Optimization - GitHub Publisher v1.1.3

set "GM_PS=%~dp0scripts\publish-github-release.ps1"

if not exist "%GM_PS%" (
  echo [ERROR] Missing publisher script: %GM_PS%
  pause
  exit /b 1
)

echo [GM] Checking publisher script syntax...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile('%GM_PS%', [ref]$null, [ref]$e); if($e.Count -gt 0){$e | ForEach-Object { Write-Host ('[SYNTAX] ' + $_.Message) -ForegroundColor Red }; exit 1}"
if errorlevel 1 (
  echo.
  echo [ERROR] GitHub publisher PowerShell syntax validation failed.
  echo [GM] Nothing was pushed to GitHub.
  pause
  exit /b 1
)

echo [OK] Publisher syntax is valid.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%GM_PS%" %*
set "GM_EXIT=%ERRORLEVEL%"
if not "%GM_EXIT%"=="0" (
  echo.
  echo [GM] GitHub publish ended with error code %GM_EXIT%.
  echo [GM] Nothing else will be pushed until the problem above is fixed.
  pause
) else (
  echo.
  echo [GM] Source code, version tag, and GitHub Release were published successfully.
  pause
)
exit /b %GM_EXIT%
