@echo off
echo ================================================
echo   Docker MySQL Setup - Fixed Password Issue
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Create .env file FIRST
echo Creating .env file...
(
    echo # Database Configuration ^(Docker MySQL^)
    echo USE_MYSQL=true
    echo USE_IN_MEMORY=false
    echo.
    echo MYSQL_HOST=127.0.0.1
    echo MYSQL_PORT=3306
    echo MYSQL_DB=movie_booking
    echo MYSQL_USER=root
    echo MYSQL_PASSWORD=rootpassword
    echo.
    echo # Node Configuration
    echo NODE_ID=node-1
    echo NODE_HOST=localhost
    echo NODE_PORT=4000
) > .env
echo [OK] .env file created
echo.

REM Clean up any existing containers
echo Cleaning up existing containers...
docker-compose down -v >nul 2>&1
echo [OK] Cleanup complete
echo.

REM Start MySQL container
echo Starting MySQL container...
docker-compose up -d

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start MySQL container
    pause
    exit /b 1
)

echo [OK] MySQL container started
echo.

REM Wait for MySQL to initialize
echo Waiting for MySQL to initialize (this may take 30 seconds)...
timeout /t 30 /nobreak >nul

REM Wait for MySQL to be ready
echo Waiting for MySQL to be ready...
:WAIT_LOOP
docker exec movie_booking_mysql mysql -u root -prootpassword -e "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Still waiting for MySQL to be ready...
    timeout /t 5 /nobreak >nul
    goto WAIT_LOOP
)

echo [OK] MySQL is ready!
echo.

REM FIX: Set passwords for ALL root users properly
echo Setting MySQL root passwords for all hosts...
docker exec movie_booking_mysql mysql -u root -prootpassword -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'rootpassword';" >nul 2>&1
docker exec movie_booking_mysql mysql -u root -prootpassword -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'rootpassword';" >nul 2>&1
docker exec movie_booking_mysql mysql -u root -prootpassword -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;" >nul 2>&1
docker exec movie_booking_mysql mysql -u root -prootpassword -e "FLUSH PRIVILEGES;" >nul 2>&1
echo [OK] MySQL passwords configured
echo.

REM Verify the setup
echo Verifying MySQL user configuration...
docker exec movie_booking_mysql mysql -u root -prootpassword -e "SELECT user, host, authentication_string FROM mysql.user WHERE user = 'root';" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] User verification failed
    goto TROUBLESHOOT
)
echo [OK] MySQL users verified
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Dependencies installed
echo.

REM Initialize database
echo Initializing database...
node scripts\init-mysql-db.js

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database initialization failed
    goto TROUBLESHOOT
)

echo [OK] Database initialized successfully!
echo.

REM Build backend
echo Building backend...
cd backend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Backend built successfully
echo.

goto SUCCESS

:TROUBLESHOOT
echo.
echo ================================================
echo            TROUBLESHOOTING STEPS
echo ================================================
echo.
echo 1. Check MySQL users and passwords:
docker exec movie_booking_mysql mysql -u root -prootpassword -e "SELECT user, host, plugin, authentication_string FROM mysql.user;"
echo.
echo 2. Test connection with different methods:
echo    Testing from container...
docker exec movie_booking_mysql mysql -u root -prootpassword -e "SELECT 'Container connection works';"
echo.
echo    Testing from host network...
docker exec movie_booking_mysql mysql -h127.0.0.1 -uroot -prootpassword -e "SELECT 'Host connection works';"
echo.
echo 3. Check if movie_booking database exists:
docker exec movie_booking_mysql mysql -u root -prootpassword -e "SHOW DATABASES;"
echo.
pause
exit /b 1

:SUCCESS
echo ================================================
echo          SETUP COMPLETED SUCCESSFULLY!
echo ================================================
echo.
echo Docker Container Status:
docker ps --filter "name=movie_booking_mysql"
echo.
echo You can now start your application nodes.
echo.
pause