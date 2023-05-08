import fs from "fs";
import process from "process";
import { transcribeDateToISO, restartApplication } from "./utils.js";
import * as properties from "./properties.js";


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


function doLog(logFunction :(...data :any[]) => void, ...data :any[]) {
    let message = `[${transcribeDateToISO(new Date(), true)}] ${data.join(' ')}`
    logFunction(message);
    logFile?.write(message + "\n");
}