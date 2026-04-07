@echo off
echo Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Starting backend...
cd c:\Users\NOSA\Desktop\nosa_web_projects\full_inventory_website\backend
start "Backend" node server.js
timeout /t 3 >nul

echo Starting frontend...
cd c:\Users\NOSA\Desktop\nosa_web_projects\full_inventory_website\frontend
start "Frontend" npm run dev

echo.
echo Ready! Open http://localhost:3000 in your browser
pause
