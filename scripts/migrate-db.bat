@echo off
cd /d d:\vexmotor
echo ==========================================
echo Running Database Migration
echo ==========================================
node scripts\run-migration.mjs
echo ==========================================
echo Migration Complete
echo ==========================================
pause
