@echo off
setlocal
set ROOT=%~dp0..
cd /d "%ROOT%"
call npm install
call npm run dist:win
endlocal
