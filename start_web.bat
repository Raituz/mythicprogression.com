@echo off
title MythicProgression.com - Servidor Local
cd /d "%~dp0"

set "PY_EXE="
if exist "%APPDATA%\uv\python\cpython-3.12-windows-x86_64-none\python.exe" (
    set "PY_EXE=%APPDATA%\uv\python\cpython-3.12-windows-x86_64-none\python.exe"
) else if exist "D:\MythicProgressionbot\Bot-Principal\.venv\Scripts\python.exe" (
    set "PY_EXE=D:\MythicProgressionbot\Bot-Principal\.venv\Scripts\python.exe"
) else if exist "%APPDATA%\uv\python\cpython-3.12.15-windows-x86_64-none\python.exe" (
    set "PY_EXE=%APPDATA%\uv\python\cpython-3.12.15-windows-x86_64-none\python.exe"
) else (
    where python >nul 2>&1
    if not errorlevel 1 set "PY_EXE=python"
)

if defined PY_EXE (
    echo [MythicProgression] Iniciando servidor web de alta velocidad...
    "%PY_EXE%" server.py
) else (
    echo [MythicProgression] Python no encontrado, abriendo index.html en el navegador...
    start index.html
)
pause
