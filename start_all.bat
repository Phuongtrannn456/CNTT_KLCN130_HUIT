@echo off
chcp 65001 >nul
title KHOI DONG TOAN BO HE THONG WEB3 & AI
color 0A

echo ======================================================================
echo    KHOI DONG HE THONG WEB3 & AI - GIAO DUC PHO THONG
echo ======================================================================
echo.

:: 1. Kiem tra & khoi dong MongoDB
echo [1/4] Dang kiem tra va khoi dong MongoDB (Port 27017)...
netstat -ano | findstr :27017 >nul
if %errorlevel% neq 0 (
    start "1. MongoDB Database" "D:\mongodb\bin\mongod.exe" --dbpath "D:\mongodb\data"
    timeout /t 3 /nobreak >nul
    echo      -> MongoDB da khoi dong thanh cong!
) else (
    echo      -> MongoDB da dang chay san.
)

:: 2. Khoi dong ML Service (FastAPI / PhoBERT)
echo [2/4] Dang khoi dong Python ML AI Service (Port 8001)...
netstat -ano | findstr :8001 >nul
if %errorlevel% neq 0 (
    start "2. Python AI Service (Port 8001)" /D "E:\KhoaLuan\CNTT_KLCN130_HUIT\ml-service" "D:\Python311\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8001
    timeout /t 3 /nobreak >nul
    echo      -> ML AI Service da khoi dong thanh cong!
) else (
    echo      -> ML AI Service da dang chay san.
)

:: 3. Khoi dong Backend Node.js
echo [3/4] Dang khoi dong Backend Node.js Server (Port 5000)...
netstat -ano | findstr :5000 >nul
if %errorlevel% neq 0 (
    start "3. Backend Server (Port 5000)" /D "E:\KhoaLuan\CNTT_KLCN130_HUIT" cmd /c "node backend/server.js"
    timeout /t 3 /nobreak >nul
    echo      -> Backend Server da khoi dong thanh cong!
) else (
    echo      -> Backend Server da dang chay san.
)

:: 4. Khoi dong Cloudflare Tunnel
echo [4/4] Dang khoi dong Cloudflare Tunnel...
tasklist /fi "imagename eq cloudflared.exe" | findstr cloudflared.exe >nul
if %errorlevel% neq 0 (
    start "4. Cloudflare Public Tunnel" "C:\Users\Phuong\cloudflared.exe" tunnel --url http://localhost:5000
    timeout /t 4 /nobreak >nul
    echo      -> Cloudflare Tunnel da khoi dong!
) else (
    echo      -> Cloudflare Tunnel da dang chay san.
)

echo.
echo ======================================================================
echo    DA KHOI DONG TOAN BO 4 DICH VU THANH CONG!
echo ======================================================================
echo - Frontend Vercel : https://frontend-blush-three-8x6ecte1wh.vercel.app
echo - Backend Local   : http://localhost:5000
echo - ML AI Local     : http://127.0.0.1:8001
echo ======================================================================
echo.
echo Dang mo Frontend tren trinh duyet...
start "" "https://frontend-blush-three-8x6ecte1wh.vercel.app"
echo Nhan phim bat ky de dong cua so nay (cac dich vu van chay ngam binh thuong).
pause >nul
