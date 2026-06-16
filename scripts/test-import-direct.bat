@echo off
cd /d d:\vexmotor
echo ==========================================
echo Testing Product Data Import (First 5)
echo ==========================================
echo.
echo This will test import with first 5 products
echo Full log will be saved to: scripts\import-full-log.txt
echo.
pause

node scripts\import-direct.js

echo.
echo ==========================================
echo Test Complete
echo ==========================================
echo.
echo Check scripts\import-full-log.txt for details
echo.
pause
