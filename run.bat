@echo off
REM Sets the title of the command prompt window
TITLE Video Silence Remover Server

echo ===================================================
echo  Starting Video Silence Remover Application
echo ===================================================

REM Check if node_modules folder exists. If not, run npm install.
IF NOT EXIST "node_modules" (
    echo.
    echo Running one-time setup to install dependencies...
    npm install
)

echo.
echo Starting the Node.js server...
REM Start the server in the current window. The user can close this window to stop the server.
start "Silence Remover Server" cmd /c "node server.js"

echo.
echo Opening the application in your default web browser...
REM The timeout gives the server a moment to start before opening the browser.
timeout /t 2 /nobreak > NUL
start http://localhost:3000

echo.
echo ===================================================
echo  The server is running!
echo  You can close the new black command window
echo  that appeared to stop the server.
echo ===================================================

REM This command keeps the initial window open for a few seconds to read the messages.
timeout /t 7
