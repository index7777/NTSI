@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "PROJECT_NAME=NTSI"
set "REPO_URL=https://github.com/index7777/NTSI.git"
set "BRANCH=main"

:menu
cls
echo =====================================================
echo   NTSI - A/B Computer Sync
echo   Folder: %CD%
echo   Remote: %REPO_URL%
echo =====================================================
echo   FIRST COMPUTER: use [2] to make the first push.
echo   OTHER COMPUTER: clone the repo once, then use [1].
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
echo Invalid choice.
pause
goto menu

:preflight
where git >nul 2>nul || (echo [ERROR] Git is not available in PATH.& exit /b 1)
where npm >nul 2>nul || (echo [ERROR] npm is not available in PATH.& exit /b 1)
if not exist "game\package.json" (echo [ERROR] game\package.json was not found.& exit /b 1)
if not exist "HANDOFF.md" (echo [ERROR] HANDOFF.md was not found.& exit /b 1)
exit /b 0

:ensure_repo
if not exist ".git" (
  git init -b "%BRANCH%" || exit /b 1
)
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
if not errorlevel 1 git pull --rebase origin "%BRANCH%" || goto failed
call :install_core || goto failed
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
if errorlevel 1 (
  git commit -m "Sync NTSI project updates" || goto failed
) else (
  echo No new local changes to commit.
)
git ls-remote --exit-code --heads origin "%BRANCH%" >nul 2>nul
if not errorlevel 1 git pull --rebase origin "%BRANCH%" || goto failed
git push -u origin "%BRANCH%" || goto failed
echo.
echo Ending-work sync completed successfully.
pause
goto menu

:status
call :preflight || goto failed
call :ensure_repo || goto failed
echo.
git status --short --branch
echo.
git remote -v
echo.
node --version
npm --version
if exist "game\node_modules" (echo node_modules: installed) else (echo node_modules: missing)
pause
goto menu

:install
call :preflight || goto failed
call :install_core || goto failed
echo Dependencies installed successfully.
pause
goto menu

:install_core
pushd "game"
if exist "package-lock.json" (call npm ci) else (call npm install)
set "INSTALL_RESULT=!ERRORLEVEL!"
popd
if not "!INSTALL_RESULT!"=="0" exit /b 1
exit /b 0

:failed
echo.
echo [ERROR] Git or npm operation failed.
echo If GitHub requests access, sign in through Git Credential Manager.
pause
goto menu
