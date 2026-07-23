@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Run from a temporary copy so git pull can safely update sync.bat itself.
if /I not "%~1"=="--runner" (
  set "SYNC_TEMP=%TEMP%\ntsi-sync-%RANDOM%-%RANDOM%.bat"
  copy /y "%~f0" "!SYNC_TEMP!" >nul || exit /b 1
  call "!SYNC_TEMP!" --runner "%~dp0"
  set "SYNC_RESULT=!ERRORLEVEL!"
  del /q "!SYNC_TEMP!" >nul 2>nul
  exit /b !SYNC_RESULT!
)

cd /d "%~2"
set "REPO_URL=https://github.com/index7777/NTSI.git"
set "BRANCH=main"

:menu
cls
echo =====================================================
echo   NTSI - A/B Computer Sync
echo   Folder: %CD%
echo   Remote: %REPO_URL%
echo =====================================================
echo   [1] Start work  - pull latest, then install packages
echo   [2] Ending work - build, commit and push changes
echo   [3] Status      - branch, changes, Node, node_modules
echo   [4] Install dependencies only
echo   [0] Exit
echo =====================================================
set "CHOICE="
set /p "CHOICE=Choose: "
if "%CHOICE%"=="1" goto start_work
if "%CHOICE%"=="2" goto finish_work
if "%CHOICE%"=="3" goto status
if "%CHOICE%"=="4" goto install
if "%CHOICE%"=="0" exit /b 0
goto menu

:preflight
where git >nul 2>nul || (echo [ERROR] Git is not available in PATH.& exit /b 1)
where npm >nul 2>nul || (echo [ERROR] npm is not available in PATH.& exit /b 1)
if not exist "game\package.json" (echo [ERROR] game\package.json was not found.& exit /b 1)
if not exist "docs\production\HANDOFF.md" (echo [ERROR] docs\production\HANDOFF.md was not found.& exit /b 1)
exit /b 0

:ensure_repo
if not exist ".git" git init -b "%BRANCH%" || exit /b 1
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%" || exit /b 1
) else (
  for /f "delims=" %%R in ('git remote get-url origin') do set "CURRENT_ORIGIN=%%R"
  if /I not "!CURRENT_ORIGIN!"=="%REPO_URL%" (
    echo [ERROR] Unexpected origin: !CURRENT_ORIGIN!
    echo Expected: %REPO_URL%
    exit /b 1
  )
)
exit /b 0

:start_work
call :preflight || goto failed
call :ensure_repo || goto failed
git fetch origin || goto failed
git ls-remote --exit-code --heads origin "%BRANCH%" >nul 2>nul
if errorlevel 1 goto after_pull
git pull --rebase origin "%BRANCH%" || goto failed
:after_pull
call :install_core || goto install_locked
echo.
echo Start-work sync completed successfully.
pause
goto menu

:finish_work
call :preflight || goto failed
call :ensure_repo || goto failed
pushd "game"
call npm run build
if errorlevel 1 (popd& goto failed)
popd
git add -A || goto failed
git diff --cached --quiet
if errorlevel 1 git commit -m "Sync NTSI project updates" || goto failed
git ls-remote --exit-code --heads origin "%BRANCH%" >nul 2>nul
if errorlevel 1 goto do_push
git pull --rebase origin "%BRANCH%" || goto failed
:do_push
git push -u origin "%BRANCH%" || goto failed
echo.
echo Ending-work sync completed successfully.
pause
goto menu

:status
call :preflight || goto failed
call :ensure_repo || goto failed
git status --short --branch
git remote -v
node --version
npm --version
if exist "game\node_modules" (echo node_modules: installed) else (echo node_modules: missing)
pause
goto menu

:install
call :preflight || goto failed
call :install_core || goto install_locked
echo Dependencies installed successfully.
pause
goto menu

:install_core
pushd "game"
if exist "node_modules" (call npm install) else if exist "package-lock.json" (call npm ci) else (call npm install)
set "INSTALL_RESULT=!ERRORLEVEL!"
popd
if not "!INSTALL_RESULT!"=="0" exit /b 1
exit /b 0

:install_locked
echo.
echo [ERROR] A game development server is probably using esbuild.exe.
echo Close the NTSI dev server and its terminal, then choose [4].
pause
goto menu

:failed
echo.
echo [ERROR] Git or npm operation failed.
pause
goto menu
