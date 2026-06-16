@echo off
cd /d d:\vexmotor
echo ==========================================
echo Testing Database Connection
echo ==========================================
echo.

node scripts\test-db-connection.js

echo.
echo ==========================================
pause
