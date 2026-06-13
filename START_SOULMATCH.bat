@echo off
cd /d "%~dp0"
echo Starting SoulMatch Echo First on http://localhost:5500/
npm install
npm run dev
pause
