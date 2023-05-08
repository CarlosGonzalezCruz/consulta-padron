import child_process from "child_process";


export function transcribeDateToISO(date :Date, includeTimeOfDay :boolean = false) {
    return `${date.getFullYear()}-${enforceTwoDigits(date.getMonth() + 1)}-${enforceTwoDigits(date.getDate())}`
        + (includeTimeOfDay ? ` ${enforceTwoDigits(date.getHours())}:${enforceTwoDigits(date.getMinutes())}:${enforceTwoDigits(date.getSeconds())}` : ``);
}


export function enforceTwoDigits(value :number) {
    if(value < 10) {
        return "0" + value;
    } else {
        return value.toString();
    }
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