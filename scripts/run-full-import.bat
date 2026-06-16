@echo off
cd /d d:\vexmotor
echo ==========================================
echo Full Product Data Import (ALL 123 Products)
echo ==========================================
echo.
echo This will import ALL products with:
echo - Product info (name, SKU, price, description)
echo - All images (gallery + dimension)
echo - All specifications
echo - All PDF documents
echo.
echo This may take a few minutes...
echo.
pause

node scripts\import-full.js

echo.
echo ==========================================
echo Import Complete
echo ==========================================
echo.
pause
