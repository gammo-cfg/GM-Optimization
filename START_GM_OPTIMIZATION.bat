@echo off
setlocal
cd /d "%~dp0"
title GM-Optimization - Setup and Development
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-and-run.ps1"
set "GM_EXIT=%ERRORLEVEL%"
if not "%GM_EXIT%"=="0" (
  echo.
  echo [GM] Setup or launch ended with error code %GM_EXIT%.
  pause
)
exit /b %GM_EXIT%
