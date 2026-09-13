@echo off
setlocal
title Financas do Casal
chcp 65001 >nul

rem === Financas do Casal ==================================================
rem  Sobe TUDO (React + API) num processo so na porta 8080 e abre o
rem  navegador. Feche esta janela para parar.
rem
rem  1a vez: compila o front (baixa o Node, ~2-4 min). Depois: ~20s.
rem  Mudou algo no frontend? Rode  atualizar-frontend.bat  antes.
rem =======================================================================

set "JAVA_HOME=C:\Users\Desktop 01\.jdks\jdk-26.0.2.1+1"
set "MVN=C:\Users\Desktop 01\.maven\apache-maven-3.9.11\bin\mvn.cmd"

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERRO] JDK 26 nao encontrado em: %JAVA_HOME%
  echo Ajuste a linha JAVA_HOME no topo deste arquivo.
  pause & exit /b 1
)

cd /d "%~dp0backend"

if not exist "target\classes\static\index.html" (
  echo.
  echo === Preparando o app pela primeira vez ^(pode levar alguns minutos^) ===
  echo.
  call "%MVN%" -ntp -Dmaven.test.skip=true prepare-package
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao preparar o app. Veja as mensagens acima.
    pause & exit /b 1
  )
)

echo.
echo  Servidor: http://localhost:8080     ^(feche esta janela para parar^)
echo.

rem Abre o navegador quando a porta comecar a responder (janela silenciosa).
start "abrir navegador" /min cmd /c "@echo off & for /l %%n in (1,1,150) do (curl -s -f -o nul http://localhost:8080/ && (start http://localhost:8080 & exit /b) || ping -n 3 127.0.0.1 >nul)"

call "%MVN%" -ntp spring-boot:run -Dspring-boot.run.profiles=local

echo.
echo Servidor encerrado.
pause
