@echo off
title Discord Music Bot

set "BOT_DIR=%~dp0"
cd /d "%BOT_DIR%"

if not exist "logs" mkdir logs
if not exist "data" mkdir data

set "PATH=%BOT_DIR%runtime\node;%BOT_DIR%bin;%PATH%"
set "NODE_ENV=production"
set "YTDLP_PATH=%BOT_DIR%bin\yt-dlp.exe"
set "FFMPEG_PATH=%BOT_DIR%bin\ffmpeg.exe"

echo [BOT] Running database setup...
"%BOT_DIR%runtime\node\node.exe" node_modules\prisma\build\index.js db push --skip-generate

echo [BOT] Starting Discord Music Bot...
echo [BOT] Press Ctrl+C to stop
echo.

"%BOT_DIR%runtime\node\node.exe" dist\index.js

echo.
echo [BOT] Bot has stopped.
pause
