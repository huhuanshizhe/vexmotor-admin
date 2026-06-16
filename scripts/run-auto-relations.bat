@echo off
cd /d d:\vexmotor
echo ==========================================
echo Auto Product Relations Generator
echo ==========================================
echo.
echo This will automatically create product relationships:
echo - Same series products (similar)
echo - Motors ↔ Drivers (compatible)
echo - Same frame size (mechanical)
echo - Voltage matching (power-control)
echo.
echo This will take about 1-2 minutes...
echo.
pause

node scripts\auto-relations.js

echo.
echo ==========================================
echo Complete
echo ==========================================
echo.
pause
