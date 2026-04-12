@echo off
title Rental System - Dev Tools

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

:exit_program
cls
echo.
echo  Goodbye!
echo.
timeout /t 1 >nul
exit /b 0
