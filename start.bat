@echo off
title MyDocs - File Sharing System
echo ===================================================================
echo   Starting MyDocs Cloud & File Sharing System...
echo ===================================================================
echo.
echo Launching server at http://localhost:5000 ...
timeout /t 2 /nobreak >nul
start http://localhost:5000
node server.js
pause
