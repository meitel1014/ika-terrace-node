@echo off
cd /d "%~dp0"

echo.
echo ====================================
echo   Dezifes NodeCG
echo ====================================
echo.

echo Starting NodeCG...
echo Dashboard: http://localhost:9090
echo.

npx nodecg start

echo.
echo NodeCG stopped.
pause
