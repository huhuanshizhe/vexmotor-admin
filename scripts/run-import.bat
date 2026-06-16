@echo off
cd /d d:\vexmotor
echo ==========================================
echo Starting Product Data Import
echo ==========================================
echo.

node scripts\import-products.js > import-output.log 2>&1

echo.
echo ==========================================
echo Import Complete
echo ==========================================
echo.
echo Check import-output.log for details
echo.
type import-output.log
echo.
pause
