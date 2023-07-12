import child_process from "child_process";


// Este módulo define funciones misceláneas que no corresponden a una tarea concreta. Como queremos poder acceder a este módulo desde el
// resto de módulos, se debe evitar agregar dependencias de otros módulos del programa aquí. Sin embargo, sí se permiten dependencias externas.


/** Representa un objeto fecha como un string en formato ISO (YYYY-MM-DD). Si `includeTimeOfDay` es true, la representación también incluye la hora. */
export function transcribeDateToISO(date :Date, includeTimeOfDay :boolean = false) {
    return `${date.getFullYear()}-${enforceTwoDigits(date.getMonth() + 1)}-${enforceTwoDigits(date.getDate())}`
        + (includeTimeOfDay ? ` ${enforceTwoDigits(date.getHours())}:${enforceTwoDigits(date.getMinutes())}:${enforceTwoDigits(date.getSeconds())}` : ``);
}


/** Nombres de los meses, donde ENERO=1 */
const MONTH_NAMES = <const>["<0>", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];


/** Devuelve el nombre del mes correspondiente al id indicado, partiendo de que ENERO=1. No se permiten valores fuera del rango [1, 12]. */
export function getMonthName(id :number) {
    if(id >= 1 && id <= 12) {
        return MONTH_NAMES[id];
    } else {
        throw new RangeError(`Se ha consultado el nombre del mes ${id}. Sólo se permiten valores del 1 al 12.`);
    }
}


/** Dado el nombre de un mes, devuelve el id de dicho mes, partiendo de que ENERO=1. */
export function getMonthId(name :string) {
    let selectedId = (MONTH_NAMES as readonly string[]).indexOf(name.toUpperCase());
    if(selectedId != -1) {
        return selectedId;
    } else {
        return null;
    }
}


/** Itera por los nombres de todos los meses. */
export function* allMonthNames() {
    for(let i = 1; i < 13; i++) {
        yield MONTH_NAMES[i];
    }
}


/** Representa localmente un objeto fecha, en formato DD de MMMM, YYYY. */
export function writeDate(date :Date) {
    return `${date.getDate() + 1} de ${getMonthName(date.getMonth() + 1)}, ${date.getFullYear()}`;
}


/** Representa un valor lógico como "Sí" (`true`, `"T"`) o "No" (`false`, `"F"`). Si el valor es nulo, el resultado también es nulo. */
export function writeBoolean(value :Boolean | DBBinary | null) {
    if(value == null) {
        return null;
    } else {
        return (value == true || value == 'T') ? "Sí" : "No";
    }
}


/** Representa un valor numérico positivo con al menos dos cifras, p.ej 5 → 05, 10 → 10. */
export function enforceTwoDigits(value :number) {
    if(value < 0) {
        throw new Error("No se permiten números negativos.");
    }
    if(value < 10) {
        return "0" + value;
    } else {
        return value.toString();
    }
}


/** Garantiza a Typescript que el valor no es nulo. */
export function ensureNotNull<T>(value :T | null | undefined) : value is T {
    return value != null;
}

// Las siguientes funciones son extensiones del prototipo de Array. Sus descripciones se encuentran en @types/index.d.ts.

Array.prototype.asyncMap = function<T, U>(fn :(value :T) => Promise<U>) {
    return Promise.all(this.map(async (v :T) => await fn(v)));
}

Array.prototype.contains = function<T>(o :T) {
    return this.indexOf(o) != -1;
}


// Las siguientes funciones corresponden a una señal que se dispara cuando Passport termine de configurarse y que otros módulos pueden esperar.

// Extraemos la función de resolución de la promesa para ejecutarla cuando la necesitemos fuera de su contexto:
let passportReadyResolve :() => void;
let passportReadyPromise = new Promise<void>(resolve => {
    passportReadyResolve = resolve;
});

/** Dispara la señal de Passport para todos los módulos que quedan a la espera que concluya su configuración. */
export function triggerPassportReady() {
    passportReadyResolve();
}


/** Queda a la espera de que otro módulo active esta señal mediante `utils.triggerPassportReady()`. */
export async function passportReady() {
    if(!passportReadyPromise) {
        return;
    } else {
        await passportReadyPromise;
    }
}


/** Cierra el programa e intenta abrir una nueva instancia del mismo, como un proceso independiente en el sistema operativo. */
export function restartApplication() {
    process.on("exit", () => {
        child_process.spawn(process.argv.shift() + "", process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: "inherit"
        });
    });
    process.exit();
}