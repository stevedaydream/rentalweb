@echo off
chcp 65001 >nul
title Rental System - Dev Tools
:: Run from this file's own directory. Double-clicking already does that, but a
:: shortcut with a different "Start in", or launching from another drive, would
:: otherwise run npm/firebase in the wrong place.
cd /d "%~dp0"

:: firebase deploy loads functions/index.js in a child process and gives it only
:: 10s to answer the discovery request. On a cold Windows run (Defender scanning
:: functions/node_modules right after "npm run build" wrote dist/) that can be
:: exceeded, failing with "Cannot determine backend specification". Value is in
:: seconds and is only a ceiling -- discovery still returns as soon as it is ready.
set FUNCTIONS_DISCOVERY_TIMEOUT=120

:menu
cls
echo.
echo  ==========================================
echo        Rental System  Dev Tools
echo  ==========================================
echo.
echo  -- Local Development --
echo   1. Start dev environment  (emulator + frontend)
echo   2. Stop all services      (kill ports)
echo   3. Start LINE Bot tunnel  (Cloudflare Tunnel)
echo   4. Open Emulator UI       (localhost:4000)
echo.
echo  -- Production Deploy --
echo   5. Deploy Cloud Functions
echo   6. Deploy Firestore rules + indexes
echo   7. Deploy frontend        (build + hosting)
echo   8. Deploy all             (functions + rules + frontend)
echo.
echo  -- 版本管理 --
echo   9. 更新版本號
echo.
echo   0. Exit
echo.
set /p choice= Enter option:

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto stop_dev
if "%choice%"=="3" goto start_tunnel
if "%choice%"=="4" goto open_emulator_ui
if "%choice%"=="5" goto deploy_functions
if "%choice%"=="6" goto deploy_rules
if "%choice%"=="7" goto deploy_hosting
if "%choice%"=="8" goto deploy_all
if "%choice%"=="9" goto update_version
if "%choice%"=="0" goto exit_program
echo.
echo  [!] Invalid option, try again
timeout /t 1 >nul
goto menu

:: ==========================================
:: Local Development
:: ==========================================

:start_dev
cls
echo.
echo  [1] Start dev environment (emulator + frontend)
echo  ----------------------------------------
echo  Opening in a new window. Close that window to stop.
echo  Frontend : http://localhost:5173
echo  Emulator : http://localhost:4000
echo.
start "Dev - Emulator + Frontend" cmd /k "npm start"
echo  New window opened. Press any key to return to menu...
pause >nul
goto menu

:stop_dev
cls
echo.
echo  [2] Stop all services (kill ports)
echo  ----------------------------------------
call npm run stop
echo.
echo  Done. Press any key to return to menu...
pause >nul
goto menu

:start_tunnel
cls
echo.
echo  [3] Start LINE Bot tunnel (Cloudflare Tunnel)
echo  ----------------------------------------
echo  Exposing localhost:5001 to LINE platform.
echo.
echo  Webhook URL format:
echo  https://xxxx.trycloudflare.com/rental-system-7675e/asia-east1/lineWebhook?lid=YOUR_UID
echo.
echo  Opening in a new window. Close that window to stop.
echo.
start "Cloudflare Tunnel - LINE Bot" cmd /k "cloudflared tunnel --url http://localhost:5001"
echo  New window opened. Press any key to return to menu...
pause >nul
goto menu

:open_emulator_ui
cls
echo.
echo  [4] Open Emulator UI (make sure emulator is running first)
echo  ----------------------------------------
start http://localhost:4000
echo  Opened in browser. Press any key to return to menu...
pause >nul
goto menu

:: ==========================================
:: Production Deploy
:: ==========================================

:deploy_functions
cls
echo.
echo  [5] Deploy Cloud Functions
echo  ----------------------------------------
echo  [WARNING] This will update production Cloud Functions!
echo.
set /p confirm= Continue? (y/N):
if /i not "%confirm%"=="y" (
  echo  Cancelled.
  timeout /t 1 >nul
  goto menu
)
echo.
pushd functions
call firebase deploy --only functions
popd
echo.
echo  Done. Press any key to return to menu...
pause >nul
goto menu

:deploy_rules
cls
echo.
echo  [6] Deploy Firestore rules + indexes
echo  ----------------------------------------
echo  [WARNING] This will update production Firestore rules and indexes!
echo.
set /p confirm= Continue? (y/N):
if /i not "%confirm%"=="y" (
  echo  Cancelled.
  timeout /t 1 >nul
  goto menu
)
echo.
call firebase deploy --only firestore:rules,firestore:indexes
echo.
echo  Done. Press any key to return to menu...
pause >nul
goto menu

:deploy_hosting
cls
echo.
echo  [7] Deploy frontend (build + hosting)
echo  ----------------------------------------
echo  [WARNING] This will update production frontend!
echo.
set /p confirm= Continue? (y/N):
if /i not "%confirm%"=="y" (
  echo  Cancelled.
  timeout /t 1 >nul
  goto menu
)
echo.
echo  Step 1/2: Building frontend...
call npm run build
if errorlevel 1 (
  echo.
  echo  [ERROR] Build failed. Deployment cancelled.
  echo  Press any key to return to menu...
  pause >nul
  goto menu
)
echo.
echo  Step 2/2: Deploying to Firebase Hosting...
call firebase deploy --only hosting
echo.
echo  Done. Press any key to return to menu...
pause >nul
goto menu

:deploy_all
cls
echo.
echo  [8] Deploy all (functions + rules + frontend)
echo  ----------------------------------------
echo  [WARNING] This will update ALL production services!
echo.
set /p confirm= Continue? (y/N):
if /i not "%confirm%"=="y" (
  echo  Cancelled.
  timeout /t 1 >nul
  goto menu
)
echo.
echo  Step 1/2: Building frontend...
call npm run build
if errorlevel 1 (
  echo.
  echo  [ERROR] Build failed. Deployment cancelled.
  echo  Press any key to return to menu...
  pause >nul
  goto menu
)
echo.
echo  Step 2/2: Deploying functions + rules + hosting...
pushd functions
call firebase deploy --only functions
popd
call firebase deploy --only firestore:rules,firestore:indexes,hosting
echo.
echo  Done. Press any key to return to menu...
pause >nul
goto menu

:: ==========================================
:: Exit
:: ==========================================

:update_version
cls
echo.
echo  [9] 更新版本號
echo  ----------------------------------------
echo  目前版本：
node -p "require('./package.json').version"
if %errorlevel% neq 0 (
  echo  [錯誤] 無法讀取目前版本，請確認 Node.js 與 package.json。
  pause
  goto menu
)
echo.
echo   1. 修正版 patch：1.0.0 到 1.0.1
echo   2. 功能版 minor：1.0.0 到 1.1.0
echo   3. 重大版 major：1.0.0 到 2.0.0
echo   0. 返回主選單
echo.
choice /c 1230 /n /m "選擇版本更新類型："
if errorlevel 4 goto menu
if errorlevel 3 (
  set "releaseType=major"
) else if errorlevel 2 (
  set "releaseType=minor"
) else if errorlevel 1 (
  set "releaseType=patch"
) else (
  goto menu
)
echo.
call npm version %releaseType% --no-git-tag-version --ignore-scripts
if %errorlevel% neq 0 (
  echo.
  echo  [錯誤] 版本更新失敗，請檢查上方輸出。
  pause
  goto menu
)
echo.
echo  已同步更新 package.json 與 package-lock.json。
echo  接著可用選項 7 或 8 建置並部署新版本。
echo  按任意鍵返回主選單...
pause >nul
goto menu

:exit_program
cls
echo.
echo  Goodbye!
echo.
timeout /t 1 >nul
exit /b 0
