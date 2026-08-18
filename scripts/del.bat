@echo off
cd /d "C:\Users\the exceed\Documents\lunaiadvocacia\src\routes"
if exist "processos_.$id.tsx" (
    del /f /a /q "processos_.$id.tsx"
    echo DELETED
) else (
    echo NOT FOUND
)