

export enum Flags {
    DEFINED = 1 << 0,
    NOT_NULL = 1 << 1,
    IS_NUMBER = 1 << 2,
    IS_ALPHANUMERIC = 1 << 3,
    IS_ALPHANUMERIC_WITH_SPACES = 1 << 4,
    IS_BOOLEAN = 1 << 5,
    IS_OBJECT = 1 << 6,
    PERMISSION_FORMAT_COMPLIANT = 1 << 7
}


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
        if(value != null && (typeof value != "string" || !value.match(/^\w*$/))) {
            return {success: false as const, flag: Flags.IS_ALPHANUMERIC};
        }
    }
    if(flags & Flags.IS_ALPHANUMERIC_WITH_SPACES) {
        if(value != null && (typeof value != "string" || !value.match(/^(\w|\s)*$/))) {
            return {success: false as const, flag: Flags.IS_ALPHANUMERIC};
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