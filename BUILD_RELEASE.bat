@echo off
setlocal
cd /d "%~dp0"
title GM-Optimization - Production Release Build
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-release.ps1"
set "GM_EXIT=%ERRORLEVEL%"
if not "%GM_EXIT%"=="0" (
  echo.
  echo [GM] Release build ended with error code %GM_EXIT%.
  pause
) else (
  echo.
  echo [GM] Release build completed successfully.
  echo [GM] Open the "release" folder to find the installer and portable executable.
  pause
)
exit /b %GM_EXIT%
