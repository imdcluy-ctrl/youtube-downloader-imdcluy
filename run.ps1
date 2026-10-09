# StreamForge PowerShell Launcher
Set-Location -LiteralPath $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       StreamForge : YouTube Downloader Web App         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Find Python
$pythonExe = $null

if (Test-Path ".venv\Scripts\python.exe") {
    $pythonExe = ".venv\Scripts\python.exe"
} else {
    $candidates = @(
        "python",
        "py",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe"
    )

    foreach ($cmd in $candidates) {
        try {
            $ver = & $cmd --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                $pythonExe = $cmd
                break
            }
        } catch {}
    }

    if (-not $pythonExe) {
        Write-Host "[ERROR] Python was not found on your system!" -ForegroundColor Red
        Write-Host "Please install Python 3.10+ from https://www.python.org/"
        Read-Host "Press Enter to exit..."
        exit 1
    }

    Write-Host "[*] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    & $pythonExe -m venv .venv
    if (Test-Path ".venv\Scripts\python.exe") {
        $pythonExe = ".venv\Scripts\python.exe"
    }
}

Write-Host "[*] Using Python: $pythonExe" -ForegroundColor Green
& $pythonExe --version

Write-Host ""
Write-Host "[*] Installing / checking required packages..." -ForegroundColor Yellow
& $pythonExe -m pip install -r backend\requirements.txt

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  StreamForge is running at: http://localhost:8000      " -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop the server.                      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:8000"
& $pythonExe main.py

Write-Host ""
Read-Host "Press Enter to exit..."
