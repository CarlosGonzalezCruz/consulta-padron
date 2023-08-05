#!/bin/sh

IS_ROOT=YES
if [ ! -f package.json ] || [ ! -f tsconfig.json ]; then
  IS_ROOT=NO
fi

if [ "$IS_ROOT" = "NO" ]; then
  echo "Este script ha de ser ejecutado desde la raiz del proyecto."
  exit 1
fi

echo "Reinstalando las dependencias..."
npm install

echo "Compilando la fuente..."
node_modules/.bin/tsc

if [ $? -eq 0 ]; then
  echo "Listo. Pruebe a ejecutar el programa con 'run.sh'."
else
  echo "Node.js ha de estar instalado, junto con npm.js y las herramientas para modulos nativos, y ha de ser accesible en el PATH."
fi