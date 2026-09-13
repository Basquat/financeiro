@echo off
setlocal
title Atualizar frontend
chcp 65001 >nul

rem Recompila o React e coloca no app. Rode depois de mudar algo em frontend/.
rem Depois e so abrir o iniciar.bat de novo.

set "JAVA_HOME=C:\Users\Desktop 01\.jdks\jdk-26.0.2.1+1"
set "MVN=C:\Users\Desktop 01\.maven\apache-maven-3.9.11\bin\mvn.cmd"

cd /d "%~dp0backend"

echo Recompilando o frontend...
if exist "target\classes\static" rmdir /s /q "target\classes\static"

call "%MVN%" -ntp -Dmaven.test.skip=true prepare-package
if errorlevel 1 (
  echo.
  echo [ERRO] Falhou. Veja as mensagens acima.
  pause & exit /b 1
)

echo.
echo Frontend atualizado. Abra o iniciar.bat.
pause
