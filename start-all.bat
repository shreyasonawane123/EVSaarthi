@echo off
echo ====================================================
echo starting EV Saarthi microservices...
echo ====================================================

start cmd /k "cd backend\api-gateway && npm.cmd start"
start cmd /k "cd backend\auth-service && npm.cmd start"
start cmd /k "cd backend\user-service && npm.cmd start"
start cmd /k "cd backend\vehicle-service && npm.cmd start"
start cmd /k "cd backend\admin-service && npm.cmd start"
start cmd /k "cd backend\station-service && npm.cmd start"
start cmd /k "cd backend\booking-service && npm.cmd start"

echo wait a bit for backends...
timeout /t 3 /nobreak >nul

start cmd /k "cd frontend\shell-app && npm.cmd start"
start cmd /k "cd frontend\admin-app && npm.cmd start"
start cmd /k "cd frontend\map-app && npm.cmd start"
start cmd /k "cd frontend\booking-app && npm.cmd start"

echo all services started in new windows.
pause
