@echo off
title My Notes App Launcher
echo.
echo ========================================
echo    Starting My Notes App (Electron)
echo ========================================
echo.
echo Starting embedded server and app...
echo Your notes will be saved to: D:\MyNotes
echo.

cd /d "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app\electron"

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies for first time...
    npm install
    echo.
)

echo Launching Electron app with embedded server...
npm start

echo.
echo App closed. Press any key to exit...
pause >nul
