@echo off
chcp 65001 >nul
cd /d "%~dp0"
title KHOI DONG TOAN BO HE THONG WEB3 & AI (KLCN130)
color 0A

echo ======================================================================
echo    KHOI DONG HE THONG WEB3 ^& AI - GIAO DUC PHO THONG (KLCN130)
echo ======================================================================
echo.

:: 1. Khoi dong Hardhat Blockchain Node (Port 8545)
echo [1/4] Dang kiem tra va khoi dong Hardhat Blockchain Node (Port 8545)...
netstat -ano | findstr :8545 >nul
if %errorlevel% neq 0 (
    start "1. Hardhat Blockchain Node (Port 8545)" /D "%~dp0backend" cmd /c "npx hardhat node"
    timeout /t 4 /nobreak >nul
    start "Deploy Smart Contracts" /D "%~dp0backend" /B cmd /c "npx hardhat run scripts/deploy-and-seed-sepolia.js --network localhost"
    echo      -^> Hardhat Node ^& Smart Contracts da khoi dong!
) else (
    echo      -^> Hardhat Node da dang chay san.
)

:: 2. Khoi dong ML Service (FastAPI / PhoBERT / SBERT)
echo [2/4] Dang khoi dong Python ML AI Service (Port 8001)...
netstat -ano | findstr :8001 >nul
if %errorlevel% neq 0 (
    if exist "%~dp0ml-service\venv\Scripts\python.exe" (
        start "2. Python AI Service (Port 8001)" /D "%~dp0ml-service" "%~dp0ml-service\venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8001
    ) else (
        start "2. Python AI Service (Port 8001)" /D "%~dp0ml-service" python -m uvicorn app:app --host 127.0.0.1 --port 8001
    )
    timeout /t 3 /nobreak >nul
    echo      -^> ML AI Service da khoi dong thanh cong!
) else (
    echo      -^> ML AI Service da dang chay san.
)

:: 3. Khoi dong Backend Node.js (Port 5001)
echo [3/4] Dang khoi dong Backend Node.js Server (Port 5001)...
netstat -ano | findstr :5001 >nul
if %errorlevel% neq 0 (
    start "3. Backend Server (Port 5001)" /D "%~dp0backend" cmd /c "npm run dev"
    timeout /t 2 /nobreak >nul
    echo      -^> Backend Server da khoi dong thanh cong!
) else (
    echo      -^> Backend Server da dang chay san.
)

:: 4. Khoi dong Frontend React (Port 3000)
echo [4/4] Dang khoi dong Frontend React (Port 3000)...
netstat -ano | findstr :3000 >nul
if %errorlevel% neq 0 (
    start "4. Frontend React (Port 3000)" /D "%~dp0frontend" cmd /c "npm start"
    timeout /t 2 /nobreak >nul
    echo      -^> Frontend React da khoi dong!
) else (
    echo      -^> Frontend React da dang chay san.
)

echo.
echo ======================================================================
echo    DA KHOI DONG TOAN BO 4 DICH VU THANH CONG!
echo ======================================================================
echo - Blockchain Local : http://127.0.0.1:8545
echo - ML AI Service    : http://127.0.0.1:8001
echo - Backend API      : http://localhost:5001
echo - Frontend Web     : http://localhost:3000
echo ======================================================================
echo.
echo Nhan phim bat ky de dong cua so nay (cac dich vu van chay binh thuong).
pause >nul
