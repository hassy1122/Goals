@echo off
title LifeOS
cd /d "%~dp0server"
echo Starting LifeOS (MongoDB + API + web app)… your browser will open automatically.
node scripts\start-all.js
pause
