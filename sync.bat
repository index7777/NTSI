@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "REPO_URL=https://github.com/index7777/NTSI.git"
set "BRANCH=main"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not available in PATH.
  exit /b 1
)

if not exist "game\package.json" (
  echo [ERROR] game\package.json was not found. Run this file from the NTSI project root.
  exit /b 1
)

if not exist "HANDOFF.md" (
  echo [ERROR] HANDOFF.md was not found. Update the handoff document before syncing.
  exit /b 1
)

echo [1/6] Building the game...
pushd "game"
call npm run build
if errorlevel 1 (
  popd
  echo [ERROR] Build failed. Nothing was committed or pushed.
  exit /b 1
)
popd

echo [2/6] Checking the local Git repository...
if not exist ".git" (
  git init -b "%BRANCH%"
  if errorlevel 1 exit /b 1
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  for /f "delims=" %%R in ('git remote get-url origin') do set "CURRENT_ORIGIN=%%R"
  if /I not "!CURRENT_ORIGIN!"=="%REPO_URL%" (
    echo [ERROR] The origin remote is not %REPO_URL%
    echo Current origin: !CURRENT_ORIGIN!
    echo Refusing to push to an unexpected repository.
    exit /b 1
  )
)

echo [3/6] Staging project changes...
git add -A

git diff --cached --quiet
if errorlevel 1 (
  set "COMMIT_MESSAGE=%*"
  if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=Sync NTSI project updates"
  echo [4/6] Creating commit: !COMMIT_MESSAGE!
  git commit -m "!COMMIT_MESSAGE!"
  if errorlevel 1 (
    echo [ERROR] Commit failed. Configure git user.name and user.email if requested above.
    exit /b 1
  )
) else (
  echo [4/6] No new local changes to commit.
)

echo [5/6] Checking remote updates...
git ls-remote --exit-code --heads origin "%BRANCH%" >nul 2>nul
if not errorlevel 1 (
  git pull --rebase origin "%BRANCH%"
  if errorlevel 1 (
    echo [ERROR] Pull/rebase failed. Resolve the reported conflict before pushing.
    exit /b 1
  )
)

echo [6/6] Pushing to %REPO_URL%...
git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo [ERROR] Push failed. Check GitHub authentication and repository access.
  exit /b 1
)

echo.
echo Sync completed successfully.
exit /b 0
