@echo off
setlocal

echo [BOT] Stopping Discord Music Bot...

:: Kill by window title
taskkill /fi "WINDOWTITLE eq DiscordMusicBot" /f >nul 2>&1

:: Also kill any node processes running our bot
for /f "tokens=2" %%p in ('wmic process where "CommandLine like '%%dist/index.js%%' and Name='node.exe'" get ProcessId /value 2^>nul ^| findstr ProcessId') do (
    taskkill /pid %%p /f >nul 2>&1
)

echo [BOT] Bot stopped.

endlocal
pause
