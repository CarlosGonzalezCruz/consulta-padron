@echo off

set IS_ROOT=YES
IF not exist package.json set IS_ROOT=NO
IF not exist tsconfig.json set IS_ROOT=NO

IF %IS_ROOT%==NO (
    echo Este script ha de ser ejecutado desde la raiz del proyecto.
    EXIT
)

echo Descargando el conector de Oracle DB...
CALL git submodule update --init --recursive

echo Reinstalando las dependencias...
CALL npm install

echo Compilando la fuente...
CALL node_modules/.bin/tsc

IF %ERRORLEVEL% EQU 0 (
    echo Listo. Pruebe a ejecutar el programa con 'run.bat'.
) ELSE (
    echo Node.js ha de estar instalado, junto con npm.js y las herramientas para modulos nativos, y ha de ser accesible en el PATH.
)