@echo off
title Discord Music Bot
setlocal enabledelayedexpansion

set "BOT_DIR=%~dp0"
cd /d "%BOT_DIR%"

:: -- Create required directories --
if not exist "logs" mkdir logs
if not exist "data" mkdir data

:: -- Check .env --
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo.
    echo   1. Copy .env.example to .env
    echo   2. Fill in DISCORD_TOKEN and CLIENT_ID
    echo   3. Run start.bat again
    echo.
    pause
    exit /b 1
)

:: -- Validate required tokens --
set "HAS_TOKEN=0"
set "HAS_CLIENT=0"
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    set "KEY=%%A"
    set "VAL=%%B"
    if "!KEY!"=="DISCORD_TOKEN" if not "!VAL!"=="" if not "!VAL!"=="your-discord-bot-token-here" set "HAS_TOKEN=1"
    if "!KEY!"=="CLIENT_ID" if not "!VAL!"=="" if not "!VAL!"=="your-discord-application-client-id" set "HAS_CLIENT=1"
)
if "!HAS_TOKEN!"=="0" (
    echo [ERROR] DISCORD_TOKEN is not set in .env
    pause
    exit /b 1
)
if "!HAS_CLIENT!"=="0" (
    echo [ERROR] CLIENT_ID is not set in .env
    pause
    exit /b 1
)

:: -- Set portable paths --
set "PATH=%BOT_DIR%runtime\node;%BOT_DIR%bin;%PATH%"
set "NODE_ENV=production"
set "YTDLP_PATH=%BOT_DIR%bin\yt-dlp.exe"
set "FFMPEG_PATH=%BOT_DIR%bin\ffmpeg.exe"

:: -- Run Prisma migrations --
echo [BOT] Running database migrations...
"%BOT_DIR%runtime\node\npx.cmd" prisma migrate deploy 2>>logs\error.log
if errorlevel 1 (
    echo [WARN] Prisma migrate failed, trying db push...
    "%BOT_DIR%runtime\node\npx.cmd" prisma db push --skip-generate 2>>logs\error.log
)

:: -- Get timestamp for log file --
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "DSTAMP=%%c-%%a-%%b"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "TSTAMP=%%a%%b"
set "LOGFILE=logs\bot_%DSTAMP%_%TSTAMP%.log"

:: -- Kill any existing instance --
tasklist /fi "WINDOWTITLE eq DiscordMusicBot" 2>nul | find /i "node" >nul && (
    echo [BOT] Stopping previous instance...
    taskkill /fi "WINDOWTITLE eq DiscordMusicBot" /f >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: -- Start the bot --
echo [BOT] Starting Discord Music Bot...
echo [BOT] Log file: %LOGFILE%
echo [BOT] Press Ctrl+C to stop
echo.

"%BOT_DIR%runtime\node\node.exe" dist/index.js 2>&1 > "%LOGFILE%"

if errorlevel 1 (
    echo.
    echo [ERROR] Bot exited with an error. Check %LOGFILE%
    pause
)

endlocal
