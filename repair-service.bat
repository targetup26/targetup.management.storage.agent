@echo off
SETLOCAL EnableDelayedExpansion

echo 🚀 TargetUp: Storage Agent Service Rescue & Install
echo --------------------------------------------------
echo.
echo ⚠️  IMPORTANT: Please close "Services (Local)" and "Task Manager" before continuing!
echo.
pause

echo 🛑 Stopping service (if running)...
sc stop targetstorageagent.exe >nul 2>&1

echo 🗑️  Removing service entry to break registry locks...
sc delete targetstorageagent.exe >nul 2>&1

echo 🕒 Waiting 15 seconds for Windows to release file handles...
timeout /t 15 /nobreak

echo 🧹 Cleaning up deployment artifacts...
if exist "daemon" (
    echo Deleting 'daemon' folder...
    rmdir /s /q "daemon"
)

echo ⚙️  Installing clean service (Port 3002)...
node install-service.js

echo 🛡️  Enabling Automatic Startup...
sc config targetstorageagent.exe start= auto >nul 2>&1

echo 🚀 Starting Service...
sc start targetstorageagent.exe >nul 2>&1

echo.
echo --- Service Status ---
sc query targetstorageagent.exe | findstr "STATE"
echo.
echo ✅ Done! If the state above is RUNNING, you are good to go.
echo If it still says 1058 or 1072, please RESTART your server.
echo.
pause
