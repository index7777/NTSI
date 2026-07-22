@echo off
setlocal EnableExtensions EnableDelayedExpansion
title NTSI Local Test
cd /d "%~dp0game" || (echo [ERROR] Cannot find the game folder.& pause& exit /b 1)
where npm >nul 2>nul || (echo [ERROR] Node.js and npm are required.& pause& exit /b 1)
if not exist "node_modules\" (
 echo [NTSI] Installing dependencies for the first run...
 call npm ci || (echo [ERROR] Dependency installation failed.& pause& exit /b 1)
)
for %%P in (4173 8080 3000 50001 50002) do (
 echo [NTSI] Trying http://127.0.0.1:%%P ...
 call npm run dev -- --host 127.0.0.1 --port %%P --strictPort --open
 if not errorlevel 1 exit /b 0
 echo [NTSI] Port %%P was unavailable. Trying another port...
)
echo [ERROR] Could not start the local test server on any fallback port.
pause
exit /b 1
