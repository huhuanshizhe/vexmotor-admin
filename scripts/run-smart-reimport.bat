@echo off
cd /d d:\vexmotor
echo ==========================================
echo Smart Product Data Re-Import
echo ==========================================
echo.
echo This will:
echo - Categorize all specs (electrical/mechanical/performance/environmental)
echo - Generate professional product descriptions
echo - Update all 123 products with enhanced data
echo.
pause

node scripts\smart-reimport.js

echo.
echo ==========================================
echo Complete
echo ==========================================
pause
