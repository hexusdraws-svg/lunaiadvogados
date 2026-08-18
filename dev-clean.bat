@echo off
echo Parando processos node...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Removendo cache do TanStack Router...
if exist .tanstack rmdir /s /q .tanstack

echo Iniciando servidor...
npm run dev
