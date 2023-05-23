import child_process from "child_process";


export function transcribeDateToISO(date :Date, includeTimeOfDay :boolean = false) {
    return `${date.getFullYear()}-${enforceTwoDigits(date.getMonth() + 1)}-${enforceTwoDigits(date.getDate())}`
        + (includeTimeOfDay ? ` ${enforceTwoDigits(date.getHours())}:${enforceTwoDigits(date.getMinutes())}:${enforceTwoDigits(date.getSeconds())}` : ``);
}


const MONTH_NAMES = ["<0>", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export function getMonthName(id :number) {
    if(id >= 1 && id <= 12) {
        return MONTH_NAMES[id];
    } else {
        throw new RangeError(`Only values from 1 to 12 are allowed. Received: ${id}`);
    }
}


export function getMonthId(name :string) {
    let selectedId = MONTH_NAMES.indexOf(name.toUpperCase());
    if(selectedId != -1) {
        return selectedId;
    } else {
        return null;
    }
}


export function* allMonthNames() {
    for(let i = 1; i < 13; i++) {
        yield MONTH_NAMES[i];
    }
}


export function writeDate(date :Date) {
    return `${date.getDate() + 1} de ${getMonthName(date.getMonth() + 1)}, ${date.getFullYear()}`;
}


export function writeBoolean(value :Boolean | 'T' | 'F' | null) {
    if(value == null) {
        return null;
    } else {
        return (value == true || value == 'T') ? "Sí" : "No";
    }
}


export function enforceTwoDigits(value :number) {
    if(value < 10) {
        return "0" + value;
    } else {
        return value.toString();
    }
}


export function ensureNotNull<T>(value :T | null | undefined) : value is T {
    return value != null;
}


export async function asyncArrayMap<T, U>(array :T[], conversionFn :(value :T) => Promise<U>) {
    return Promise.all(array.map(async v => await conversionFn(v)));
}


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