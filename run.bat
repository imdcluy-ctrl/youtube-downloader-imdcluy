@echo off
setlocal
title StreamForge - YouTube Downloader

:: Ensure we are in the script's directory
cd /d "%~dp0"

echo ========================================================
echo        StreamForge : YouTube Downloader Web App
echo ========================================================
echo.

set "PY_BIN="

:: 1. Check if virtual environment already exists
if exist ".venv\Scripts\python.exe" (
    set "PY_BIN=.venv\Scripts\python.exe"
    goto :SETUP_OK
)

:: 2. Check if python is in PATH
python --version >nul 2>&1
if not errorlevel 1 (
    set "PY_BIN=python"
    goto :MAKE_VENV
)

:: 3. Check Windows Python Launcher (py)
py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PY_BIN=py -3"
    goto :MAKE_VENV
)

:: 4. Check common default install directories on Windows
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    set "PY_BIN=%LocalAppData%\Programs\Python\Python313\python.exe"
    goto :MAKE_VENV
)
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set "PY_BIN=%LocalAppData%\Programs\Python\Python312\python.exe"
    goto :MAKE_VENV
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set "PY_BIN=%LocalAppData%\Programs\Python\Python311\python.exe"
    goto :MAKE_VENV
)
if exist "%LocalAppData%\Programs\Python\Python310\python.exe" (
    set "PY_BIN=%LocalAppData%\Programs\Python\Python310\python.exe"
    goto :MAKE_VENV
)
if exist "C:\Python312\python.exe" (
    set "PY_BIN=C:\Python312\python.exe"
    goto :MAKE_VENV
)
if exist "C:\Python311\python.exe" (
    set "PY_BIN=C:\Python311\python.exe"
    goto :MAKE_VENV
)

:: If none found:
echo [ERROR] Python was not found on your computer!
echo.
echo Please download and install Python (version 3.10 or newer) from:
echo   https://www.python.org/downloads/
echo.
echo IMPORTANT: During setup, make sure you check the box:
echo   [x] "Add python.exe to PATH"
echo.
pause
exit /b 1

:MAKE_VENV
echo [*] Found Python: %PY_BIN%
echo [*] Creating isolated virtual environment (.venv)...
"%PY_BIN%" -m venv .venv
if not exist ".venv\Scripts\python.exe" (
    echo [!] Virtualenv creation skipped, using system Python.
) else (
    set "PY_BIN=.venv\Scripts\python.exe"
)

:SETUP_OK
echo [*] Using Python: %PY_BIN%
"%PY_BIN%" --version

echo.
echo [*] Installing / checking required packages (FastAPI, yt-dlp, etc.)...
echo [*] (This may take 1-2 minutes on the first run, please wait...)
"%PY_BIN%" -m pip install -r backend\requirements.txt

echo.
echo ========================================================
echo   StreamForge is starting!
echo   Open in browser: http://localhost:8000
echo   Press Ctrl+C in this window to stop the server.
echo ========================================================
echo.

:: Launch browser in 2 seconds
start "" "http://localhost:8000"

:: Run the application directly
"%PY_BIN%" main.py

echo.
echo [StreamForge has shut down]
pause
