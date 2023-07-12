import fs from "fs";
import process from "process";
import { transcribeDateToISO, restartApplication } from "./utils.js";
import * as properties from "./properties.js";


// Este módulo vuelca en disco los contenidos del log del programa. De esta forma, el log persiste y se puede consultar incluso cuando el
// programa ya no esté corriendo.


const RESTART_DELAY_MS = 2000;
let logFile :fs.WriteStream | null = null;
let logEndListener = () => logFile?.end();

export function setup() {
    if(properties.get("Log.path", "") != "") {
        try {
            logFile = fs.createWriteStream(properties.get<string>("Log.path"), {flags: "a"});
        } catch(e) {
            console.error(`No se ha podido abrir el archivo especificado para logs. Causa: ${e}`);
        }
    }
    
    console.log("-----------------------------");
    logFile?.write("-----------------------------\n");

    // Aquí estamos añadiendo funcionalidad a los métodos console.log, console.warn y console.error para que usen nuestro método doLog.
    let defaultConsoleLog = console.log;
    let defaultConsoleWarn = console.warn;
    let defaultConsoleError = console.error;
    console.log = function(...data :any[]) {
        doLog(defaultConsoleLog, ...data);
    }
    console.warn = function(...data :any[]) {
        doLog(defaultConsoleWarn, ...data);
    }
    console.error = function(...data :any[]) {
        doLog(defaultConsoleError, ...data);
    }

    process.on("uncaughtException", (e) => {
        console.error(`Excepción no capturada: ${e.stack}`);
        setTimeout(() => {
            if(properties.get("Log.restart-on-uncaught-ex", false)) {
                process.off("exit", logEndListener);
                console.error("Se va a intentar reiniciar la aplicación...");
                logFile?.end();
                restartApplication();
            }
        }, RESTART_DELAY_MS);
    });

    process.on("exit", logEndListener);
}


/** Escribe los datos en el log y además indica la fecha y hora a la que se produjo el mensaje. */
function doLog(logFunction :(...data :any[]) => void, ...data :any[]) {
    let message = `[${transcribeDateToISO(new Date(), true)}] ${data.join(' ')}`
    logFunction(message);
    logFile?.write(message + "\n");
}