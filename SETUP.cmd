@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
echo Pushing database schema...
call npx prisma db push
echo Seeding default users (Ryan & Lisa)...
call npm run db:seed
echo.
echo ===========================================
echo  SETUP DONE! Now run DEV.cmd to start.
echo  http://localhost:4747
echo  Ryan: ryan / ryan123
echo  Lisa: lisa / lisa123
echo ===========================================
pause
