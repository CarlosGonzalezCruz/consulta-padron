@echo off

set IS_ROOT=YES
if NOT EXIST package.json set IS_ROOT=NO
if NOT EXIST tsconfig.json set IS_ROOT=NO

if %IS_ROOT%==NO (
    echo Este script ha de ser ejecutado desde la raiz del proyecto.
    EXIT
)

CALL node .\out\back\main.js --profile properties/demo.ini

if %ERRORLEVEL% NEQ 0 (
    echo Asegurese de que existe el archivo 'properties/demo.ini' y tiene los datos correctos.
    echo Pruebe a ejecutar el script 'refresh.bat' e intente abrir el programa de nuevo.
)