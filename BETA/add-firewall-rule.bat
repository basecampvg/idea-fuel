@echo off
echo Adding Windows Firewall rule for Forge Dev Server (port 3006)...
netsh advfirewall firewall add rule name="Forge Dev Server (3006)" dir=in action=allow protocol=tcp localport=3006
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Firewall rule added!
    echo Your phone should now be able to connect to the dev server.
) else (
    echo.
    echo FAILED: Could not add firewall rule.
    echo Make sure you ran this as Administrator.
)
echo.
pause
