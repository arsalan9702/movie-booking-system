@echo off
echo ========================================
echo Starting Distributed Movie Booking System
echo ========================================
echo.

REM Initialize database
echo Initializing database...
cd backend
call npm install
cd ..
node scripts\init-mysql-db.js

if %ERRORLEVEL% neq 0 (
    echo Database initialization failed!
    pause
    exit /b 1
)

REM Build backend
echo.
echo Building backend...
cd backend
call npm run build
cd ..

if %ERRORLEVEL% neq 0 (
    echo Backend build failed!
    pause
    exit /b 1
)

REM Start nodes
echo.
echo Starting cluster nodes...
start "Node-1 (Leader)" cmd /k "cd backend && set NODE_ID=node-1 && set PORT=4000 && npm start"
timeout /t 3 /nobreak > nul

start "Node-2" cmd /k "cd backend && set NODE_ID=node-2 && set PORT=4001 && npm start"
timeout /t 3 /nobreak > nul

start "Node-3" cmd /k "cd backend && set NODE_ID=node-3 && set PORT=4002 && npm start"

echo.
echo ========================================
echo Cluster started successfully!
echo ========================================
echo.
echo Nodes running on:
echo   - Node 1 (Leader): http://localhost:4000
echo   - Node 2: http://localhost:4001
echo   - Node 3: http://localhost:4002
echo.
echo API Endpoints:
echo   - Health: GET http://localhost:4000/health
echo   - Movies: GET http://localhost:4000/movies
echo   - Bookings: POST http://localhost:4000/bookings
echo.
echo Press any key to exit...
pause > nul