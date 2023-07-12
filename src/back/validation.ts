

// Este módulo define la validación que se usará en endpoints para evitar valores fraudulentos como parte de la petición que podrían producir ataques XSS.

/** Condiciones que se validarán sobre el valor. */
export enum Flags {
    DEFINED = 1 << 0,
    NOT_NULL = 1 << 1,
    IS_NUMBER = 1 << 2,
    IS_ALPHANUMERIC = 1 << 3,
    IS_ALPHANUMERIC_WITH_SPACES = 1 << 4,
    IS_NON_EMPTY_STRING = 1 << 5,
    IS_BOOLEAN = 1 << 6,
    IS_OBJECT = 1 << 7,
    PERMISSION_FORMAT_COMPLIANT = 1 << 8
}


/** Comprueba que el valor proporcionado es compatible con las condiciones impuestas. */
export function check(value :any, flags :Flags) {
    if(value === undefined) {
        return {success: false as const, flag: Flags.DEFINED};
    }
    if(flags & Flags.NOT_NULL) {
        if(value === null) {
            return {success: false as const, flag: Flags.NOT_NULL};
        }
    }
    if(flags & Flags.IS_NUMBER) {
        try {
            let valueAsNumber = Number(value);
        } catch(e) {
            return {success: false as const, flag: Flags.IS_NUMBER};
        }
    }
    if(flags & Flags.IS_ALPHANUMERIC) {
        if(value != null && (typeof value != "string" || !value.match(/^(\w|[ŽžÀ-ÿ])*$/))) {
            return {success: false as const, flag: Flags.IS_ALPHANUMERIC};
        }
    }
    if(flags & Flags.IS_ALPHANUMERIC_WITH_SPACES) {
        if(value != null && (typeof value != "string" || !value.match(/^(\w|[ŽžÀ-ÿ]|\s)*$/))) {
            return {success: false as const, flag: Flags.IS_ALPHANUMERIC};
        }
    }
    if(flags & Flags.IS_NON_EMPTY_STRING) {
        if(value != null && (typeof value != "string" || value.length == 0)) {
            return {success: false as const, flag: Flags.IS_NON_EMPTY_STRING};
        }
    }
    if(flags & Flags.IS_BOOLEAN) {
        if(value != null && typeof value != "boolean") {
            return {success: false as const, flag: Flags.IS_BOOLEAN};
        }
    }
    if(flags & Flags.IS_OBJECT) {
        if(value != null && typeof value != "object") {
            return {success: false as const, flag: Flags.IS_BOOLEAN};
        }
    }
    if(flags & Flags.PERMISSION_FORMAT_COMPLIANT) {
        if(value != null && typeof value == "object") {
            for(let [key, val] of Object.entries(value)) {
                if(typeof key != "string" || (val != null && typeof val != "boolean")) {
                    return {success: false as const, flag: Flags.PERMISSION_FORMAT_COMPLIANT};
                }
            }
        }
    }

    return {success: true as const}
}