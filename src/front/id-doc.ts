import { enforceDigits } from "./utils.js";


const NATIONAL_DIGITS_AMOUNT = 9;
const FOREIGN_DIGITS_AMOUNT = 7;
const CONTROL_DIGITS = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'];
const MATCH_EXPR = /^((?<foreign>[XYZxyz])(?<foreign_digits>\d{1,7})|(?<digits>\d{1,9}))(?<control>[A-Za-z]?)$/


declare type IdDocData = {
    original :string,
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
    valid :true,
    foreign :string | null,
    digits :string,
    control :string,
    queryDigits :string,
    expectedControl :string,
    display :string,
    error :false
}


export function processIdDocument(idDoc :string) :IdDocData {
    let ret :any = {
        original: idDoc,
        valid: false,
        foreign: null,
        digits: null,
        control: null,
        queryDigits: null,
        expectedControl: null,
        error: false
    };

    try {
        let match = MATCH_EXPR.exec(idDoc.trim());
        if(!!match) {
            let [ _, __, foreign, foreignDigits, nationalDigits, control ] = match;
            
            if(!!foreign) {
                ret.foreign = foreign.toUpperCase();
                ret.digits = enforceDigits(foreignDigits, FOREIGN_DIGITS_AMOUNT);
                ret.control = control.toUpperCase();
                ret.queryDigits = ret.foreign + ret.digits;
            } else {
                ret.foreign = null;
                ret.digits = enforceDigits(nationalDigits, NATIONAL_DIGITS_AMOUNT);
                ret.control = control;
                ret.queryDigits = ret.digits;
            }
    
            let effectiveValue = Number(nationalDigits);
            if(!!foreign) {
                effectiveValue = effectiveForeignIdValue(ret.foreign, foreignDigits);
            }
            let expectedControl = calculateIdControlCharacter(effectiveValue);
            ret.expectedControl = expectedControl;
    
            
            if(!!control) {
                if(ret.expectedControl == ret.control) {
                    ret.valid = true;
                } // else it's not valid
            } else {
                ret.control = expectedControl;
                ret.valid = true;
            }
            ret.display = ( !!ret.foreign ? ret.foreign : "" ) + ret.digits + ret.control;
        }

    } catch(e) {
        console.error(`No se ha podido procesar el ID ${idDoc}. Causa: ${e}`);
        ret.error = true;
    }

    return Object.freeze(ret);
}


function effectiveForeignIdValue(foreign :string, digits :string | number) {
    let foreignValue = ['X', 'Y', 'Z'].indexOf(foreign.toUpperCase());
    let ret = foreignValue * 10 ** (FOREIGN_DIGITS_AMOUNT + 1) + Number(digits) % 10 ** (FOREIGN_DIGITS_AMOUNT + 1);
    return ret;
}


function calculateIdControlCharacter(effectiveIdValue :string | number) {
    return CONTROL_DIGITS[Number(effectiveIdValue) % CONTROL_DIGITS.length];
}