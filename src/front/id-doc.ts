import { enforceDigits } from "./utils.js";


// Este módulo contiene varias funciones relativas al procesamiento del DNI/NIE/Pasaporte.

/** Número de dígitos en el DNI. */
const NATIONAL_DIGITS_AMOUNT = 9;
/** Número de dígitos en el NIE. */
const FOREIGN_DIGITS_AMOUNT = 7;
const CONTROL_DIGITS = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'];
const MATCH_EXPR = /^((?<foreign>[XYZxyz])(?<foreign_digits>\d{1,7})|(?<digits>\d{1,9}))(?<control>[A-Za-z]?)$/


/** Información acerca de un documento de identidad. */
declare type IdDocData = {
    original :string,
    isDniNie :true,
    valid :false,
    foreign :string | null,
    digits :string | null,
    queryDigits :string | null,
    control :string | null,
    expectedControl :string | null,
    display :string | null,
    error :boolean
} | {
    original :string,
    isDniNie :true,
    valid :true,
    foreign :string | null,
    digits :string,
    control :string,
    queryDigits :string,
    expectedControl :string,
    display :string,
    error :false
} | {
    original :string,
    isDniNie :false,
    queryDigits :string,
    display :string
}


/** Devuelve un objeto `IdDocData` que describe varios aspectos del documento de identidad recibido. Si `isDniNie` es false, se considerará que el documento
 *  es un pasaporte y no se validará.
 */
export function processIdDocument(idDoc :string, isDniNie :boolean) :IdDocData {
    let ret :IdDocData;
    if(isDniNie) {
        ret = {
            original: idDoc,
            isDniNie: true,
            valid: false,
            foreign: null,
            digits: null,
            control: null,
            queryDigits: null,
            expectedControl: null,
            display: null,
            error: false
        };
    } else {
        // Es un pasaporte. No hacemos nada más.
        ret = {
            original: idDoc,
            isDniNie: false,
            queryDigits: idDoc,
            display: idDoc
        };
        return ret;
    }

    try {
        let match = MATCH_EXPR.exec(idDoc.trim()); // .trim() porque el número se puede haber recibido con espacios.
        if(!!match) {
            let [ _, __, foreign, foreignDigits, nationalDigits, control ] = match; // Los grupos del Regex se obtienen en este orden.
            
            if(!!foreign) {
                // Es un NIE.
                ret.foreign = foreign.toUpperCase();
                ret.digits = enforceDigits(foreignDigits, FOREIGN_DIGITS_AMOUNT);
                ret.control = control.toUpperCase();
                ret.queryDigits = ret.foreign + ret.digits;
            } else {
                // Es un DNI.
                ret.foreign = null;
                ret.digits = enforceDigits(nationalDigits, NATIONAL_DIGITS_AMOUNT);
                ret.control = control.toUpperCase();
                ret.queryDigits = ret.digits;
            }
    
            // Obtenemos el valor efectivo que necesitamos para obtener el carácter de control.
            let effectiveValue = Number(nationalDigits);
            if(!!foreign && !!ret.foreign) {
                effectiveValue = effectiveForeignIdValue(ret.foreign, foreignDigits);
            }
            let expectedControl = calculateIdControlCharacter(effectiveValue);
            ret.expectedControl = expectedControl;
    
            if(!!control) {
                if(ret.expectedControl == ret.control) {
                    // El carácter de control que se ha proporcionado coincide con el que se ha calculado.
                    (ret as any).valid = true;
                } // En otro caso, no es válido.
            } else {
                // Si no se ha proporcionado ningún carácter de control, no hacemos esta validación.
                ret.control = expectedControl;
                (ret as any).valid = true;
            }
            ret.display = ( !!ret.foreign ? ret.foreign : "" ) + ret.digits + ret.control;
        }

    } catch(e) {
        console.error(`No se ha podido procesar el Id ${idDoc}. Causa: ${e}`);
        ret.error = true;
    }

    return Object.freeze(ret);
}


/** El cálculo del valor efectivo de un NIE se calcula considerando que el carácter inicial es un valor numérico donde X=0, Y=1, Z=2. */
function effectiveForeignIdValue(foreign :string, digits :string | number) {
    let foreignValue = ['X', 'Y', 'Z'].indexOf(foreign.toUpperCase());
    let ret = foreignValue * 10 ** (FOREIGN_DIGITS_AMOUNT + 1) + Number(digits) % 10 ** (FOREIGN_DIGITS_AMOUNT + 1);
    return ret;
}


/** Calcula el carácter de control dado el valor efectivo de un identificador. */
function calculateIdControlCharacter(effectiveIdValue :string | number) {
    return CONTROL_DIGITS[Number(effectiveIdValue) % CONTROL_DIGITS.length];
}