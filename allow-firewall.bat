@echo off
title MyDocs - Allow Mobile Connection Firewall Rule
echo ===================================================================
echo   Adding Windows Firewall Exception for MyDocs (Port 5000)...
echo ===================================================================
echo.
echo Running Windows Firewall Rule Addition...
netsh advfirewall firewall delete rule name="MyDocs File Sharing (Port 5000)" >nul 2>&1
netsh advfirewall firewall add rule name="MyDocs File Sharing (Port 5000)" dir=in action=allow protocol=TCP localport=5000 profile=any
echo.
echo ===================================================================
echo   Done! Port 5000 is now open for your mobile phone.
echo   You can now scan the QR code from your phone and transfer files!
echo ===================================================================
pause
