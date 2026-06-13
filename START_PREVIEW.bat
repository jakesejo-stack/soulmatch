@echo off
cd /d "%~dp0"
echo Starting HOIL SoulMatch on http://localhost:5500
npx serve . -l 5500
pause
