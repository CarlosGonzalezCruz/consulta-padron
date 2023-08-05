#!/bin/sh

IS_ROOT=YES
if [ ! -f package.json ] || [ ! -f tsconfig.json ]; then
  IS_ROOT=NO
fi

if [ "$IS_ROOT" = "NO" ]; then
  echo "Este script ha de ser ejecutado desde la raiz del proyecto."
  exit 1
fi

node ./out/back/main.js --profile properties/demo.ini

if [ $? -ne 0 ]; then
  echo "Asegurese de que existe el archivo 'properties/demo.ini' y tiene los datos correctos."
  echo "Pruebe a ejecutar el script 'refresh.sh' e intente abrir el programa de nuevo."
fi