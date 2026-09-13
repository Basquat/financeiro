@echo off
setlocal
chcp 65001 >nul

rem Sobe o servidor (React + API) na porta 8080. Usado por scripts de automação.
rem Para o uso manual, prefira o iniciar.bat (abre o navegador sozinho).

set "JAVA_HOME=C:\Users\Desktop 01\.jdks\jdk-26.0.2.1+1"
set "MVN=C:\Users\Desktop 01\.maven\apache-maven-3.9.11\bin\mvn.cmd"

cd /d "%~dp0backend"

if not exist "target\classes\static\index.html" (
  echo Preparando o app pela primeira vez ^(pode levar alguns minutos^)...
  call "%MVN%" -ntp -Dmaven.test.skip=true prepare-package || exit /b 1
)

call "%MVN%" -ntp spring-boot:run -Dspring-boot.run.profiles=local
