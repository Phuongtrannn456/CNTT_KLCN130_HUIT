@echo off
chcp 65001 >nul
title TAT TOAN BO HE THONG WEB3 & AI (KLCN130)
color 0C

echo ======================================================================
echo    DANG DUNG TOAN BO CAC DICH VU WEB3 ^& AI...
echo ======================================================================
echo.

echo [1/4] Dung Frontend React (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [2/4] Dung Backend Node.js (Port 5001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [3/4] Dung Python ML AI Service (Port 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [4/4] Dung Hardhat Blockchain Node (Port 8545)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ======================================================================
echo    DA TAT SACH SE TOAN BO CAC DICH VU TRONG HE THONG!
echo ======================================================================
pause
