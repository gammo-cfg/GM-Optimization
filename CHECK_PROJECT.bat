@echo off
setlocal
cd /d "%~dp0"
title GM-Optimization - Project Check
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-project.ps1"
set "GM_EXIT=%ERRORLEVEL%"
if not "%GM_EXIT%"=="0" (
  echo.
  echo [GM] Project check ended with error code %GM_EXIT%.
)
pause
exit /b %GM_EXIT%
