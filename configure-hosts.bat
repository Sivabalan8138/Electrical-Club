@echo off
:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrative privileges confirmed.
) else (
    echo =================================================================
    echo WARNING: You must run this script as an Administrator!
    echo =================================================================
    echo.
    echo Please right-click this file (%~nx0) and select "Run as administrator".
    echo.
    pause
    exit /b
)

:: Append host entries
echo. >> C:\Windows\System32\drivers\etc\hosts
echo 127.0.0.1 student.electricalclub.local >> C:\Windows\System32\drivers\etc\hosts
echo 127.0.0.2 admin.electricalclub.local >> C:\Windows\System32\drivers\etc\hosts
echo 127.0.0.1 electricalclub-student.com >> C:\Windows\System32\drivers\etc\hosts
echo 127.0.0.2 electricalclub-admin.com >> C:\Windows\System32\drivers\etc\hosts

echo.
echo =================================================================
echo Mappings successfully added!
echo =================================================================
echo You can now access your portals at:
echo.
echo - http://electricalclub-student.com
echo - http://electricalclub-admin.com
echo.
pause
