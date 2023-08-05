# Consulta de Padrón

> Esta rama contiene una versión modificada del programa que, en lugar de conectarse las bases de datos del ayuntamiento, las simula utilizando datos generados aleatoriamente. De esta manera, se puede descargar, ejecutar y probar libremente la aplicación en cualquier dispositivo compatible. El perfil que se recomienda usar está en `properties/demo.ini`.

Este programa facilita la consulta de los datos padronales de los habitantes de Alcalá de Henares. El usuario debe ingresar con su cuenta del Directorio Activo del ayuntamiento y, después, se puede introducir un DNI, NIE o Pasaporte para consultar información. Según el rol asignado al usuario, se podrá consultar unos datos u otros. Algunos usuarios pueden tener rol de administrador, con lo que podrán cambiar los permisos que otros roles tienen para consultar información.

Para utilizarse, esta aplicación requiere un servidor donde ha de estar en continuo funcionamiento. Se recomienda configurar un servicio que se inicie automáticamente al arranque. Los usuarios se conectarán a través de un navegador web al puerto expuesto por la aplicación.

Algunos datos de la aplicación, como por ejemplo las conexiones a bases de datos, pueden configurarse en el archivo `properties/pro.ini`. Si este archivo no está disponible, se puede crear como una copia del archivo `properties/template.ini` con los datos que correspondan.


## Requisitos

Esta aplicación está pensada para ejecutarse en un sistema Windows. Para poder desplegar y ejecutar esta aplicación en un servidor, los siguientes programas han de estar instalados y disponibles a través del PATH:

* **Git**. Con la última versión del cliente para terminal es suficiente. Se utilizará vía scripts de arranque para preparar las dependencias.

* **Node.js 32-bit**. La versión para 32-bit está siendo deprecada debido a su antigüedad, por lo que no aparece en la portada de la web oficial. Se recomienda descargar de [aquí](https://nodejs.org/dist/v18.15.0/node-v18.15.0-x86.msi). Se instalarán todas las herramientas que solicita el instalador, asegurándonos de que quedan instalados **npm** y **node-gyp** (incluido en *Visual Studio Build Tools*, que se ofrecerá durante la instalación). **npm** ha de ser accesible en el PATH. Estos componentes son necesarios para las dependencias.

* Driver para **OracleDB**. Por diseño, el programa depende de que el sistema cuente con un driver para acceder a bases de datos de Oracle. Se dispone de una compilación personalizada para permitir la compatibilidad con el driver de 32-bit, pese a que ya está deprecado en Node. Por este motivo, este programa no puede ejecutarse para 64-bit hasta que el driver también utilice dicha arquitectura.

El usuario final solo necesita disponer de un navegador web y acceso al servidor para poder hacer uso del programa.

## Despliegue

Se dispone de dos scripts para facilitar el despliegue, ubicados en la carpeta `./scripts` de este proyecto. Se trata de scripts batch que se recomienda ejecutar desde la terminal, a fin de tener alguna traza persistente de la ejecución de los mismos. Los scripts han de ser ejecutados estrictamente desde el directorio raíz del proyecto.

La primera vez que se instale el programa, así como las sucesivas veces que se realicen cambios, se ejecutará el script `refresh.bat`. Este script realizará labores de mantenimiento automáticas, como descargar la fuente para el módulo de 32-bit de OracleDB y compilarla. Si la ejecución del programa falla, ejecutar este script ha de ser la primera medida que se toma. El script debe ejecutarse manualmente cuando un humano lo consdere necesario.

Para iniciar la aplicación del servidor propiamente, se utilizará el script `run.bat`. Este script se encargará de iniciar la aplicación, y se recomienda automatizar su ejecución mediante servicios del sistema.

El puerto, las credenciales para conectar a bases de datos y otra información quedan determinados según el perfil. El perfil por defecto puede encontrarse en `properties/pro.ini`. Es posible tener múltiples perfiles. Se pueden crear copiando el archivo
`properties/template.ini` y rellenándolo con la información que corresponda. Para
ejecutar el programa siguiendo un perfil personalizado, desde la raíz del proyecto
se ha de ejecutar el comando `node out/back/main.js -p PERFIL`, sustituyendo `PERFIL` por la ruta relativa del archivo correspondiente al perfil deseado.

## Mantenimiento

Para realizar actualizaciones al programa, se cambiará a la rama `dev` u otra rama y se implementarán los cambios. No se deben realizar commits directamente en la rama `master`, excepto merges. En caso de que se realice un commit sobre `master` por accidente, ejecutar `git reset --soft HEAD~1`. Los archivos de perfiles que contengan información sensible (por ejemplo, una contraseña) se mantendrán, en todo momento, fuera del sistema del control de versiones. Preferiblemente, se guardarán todos los archivos de perfiles en la carpeta `./properties`.

La fuente del programa está contenida en las carpetas `./src` (el código fuente) y `./web` (formato y estilo de la página). El código fuente está repartido a su vez entre `./src/back` (el servidor) y `./src/front` (el cliente). Todo el código fuente usa **Typescript**, un lenguaje de Microsoft basado en Javascript que añade declaraciones sintácticas que permiten un mejor análisis estático de tipos sobre el estándar ECMA. Cualquier desarrollador de Javascript puede utilizar Typescript con una pequeña curva de adaptación.

Antes de ejecutarse, el código debe compilarse usando el ejecutable ubicado en `./node_modules/.bin/tsc`. El compilador leerá el código fuente en `./src` y volcará en `./out` código equivalente compatible con el estándar ECMA. Tanto Node.js como cualquier navegador web pueden leer el código generado en `./out`. Bajo ninguna circunstancia se realizarán cambios manualmente al código fuente en `./out`, ya que quedarán sobreescritos a la próxima ejecución del compilador.

Todas las pruebas que se realicen durante el desarrollo han de utilizar un perfil de preproducción. Se debe evitar a toda costa conectar con permisos de escritura a tablas de producción desde una build en preproducción. Es posible especificar un sufijo para tablas en el perfil, de forma que se trabaje con tablas distintas a las establecidas en otros perfiles.

Las dependencias se gestionarán a través de npm. Las dependencias de Typescript, como definiciones de tipo, siempre se instalarán como `--save-dev` para que no se incluyan en una futura build de producción. Para modificar el proyecto, se recomienda (aunque no se requiere) utilizar VSCode. Se configurará el entorno para compilar utilizando `node_modules/.bin/tsc` siempre antes de ejecutar el programa vía `node out/back/main.js -p properties/pre.ini`, generando símbolos de depuración si aplica.

El submódulo `node-oracledb`, en principio, no es necesario modificarlo en absoluto, más allá de incluirlo en la compilación global del proyecto, lo cual habría de ser automático si está indicado como dependencia en `./package.json`. Para que este módulo esté disponible para instalar vía npm es necesario ejecutar `git submodule update --init --recursive`.

### Tareas pendientes

Por varias circunstancias, las siguientes tareas no se han incluido como parte del lanzamiento inicial del proyecto. Sin embargo, convendría que, tarde o temprano, se realizaran:

* **Tests unitarios y de integración**. Por el momento el programa carece de validación automatizada de los cambios que se realicen, permitiendo la posibilidad de que el programa demuestre comportamiento inesperado bajo ciertos casos de uso no previstos directamente en producción.

* **Empaquetar en un ejecutable**. Ejecutar en producción el programa utilizando el entorno y las herramientas de desarrollo supone varios inconvenientes, tanto de estabilidad como de uso en disco. El requisito de utilizar el módulo de Oracle para 32-bit introduce el requisito de compilar la totalidad de Node.js para 32-bit al empaquetar, lo cual no ha sido posible. Sería deseable contar con una pipeline que genere un archivo ejecutable que no dependa de Node.js a la hora de ejecutarse directamente como servicio en el sistema operativo. Idealmente, dicha pipeline debe garantizar que el código supera los tests unitarios y de integración antes de cada ejecutable que se genere.

* **Pasar a 64-bit**. Cuando los requisitos externos lo permitan, se habrá de migrar al módulo de 64-bit de OracleDB. Dado que npm ofrece una build del módulo de 64-bit vía `npm install oracledb`, no sería necesaria la compilación personalizada, por lo que se podría prescindir del submódulo node-oracledb. Al hacer esto, se puede pasar a desarrollar el proyecto con Node.js y se agilizará el proceso de despliegue.