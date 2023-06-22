import * as db from "./db-queries.js";
import * as utils from "./utils.js";

db.openMySQL();

const NO_DATA_HTML = `<span class="no-data-indicator">Sin datos</span>`;
const NO_PERMISSION_HTML = `<span class="not-allowed-indicator">Sin autorización</span>`;

const ENTRIES = [
    {
        permissionKey: "full_name",
        displayKey: "Nombre completo",
        field: "HAB.NOMBRE_COMPLETO",
        hide: true
    },
    {
        permissionKey: "is_registered",
        displayKey: "Alta en padrón",
        field: "SIT.ES_VIGENTE",
        render: (v :DBBinary) => utils.writeBoolean(v)
    },
    {
        permissionKey: "registration_date",
        displayKey: "Fecha de alta",
        field: "HAB.ALTA_MUNI_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        permissionKey: "birth_date",
        displayKey: "Fecha de nacimiento",
        field: "HAB.NACIM_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        permissionKey: "gender",
        displayKey: "Género",
        field: "HAB.SEXO_INE",
        render: (v :number) => v == 1 ? "Hombre" : v == 6 ? "Mujer" : "Otro"
    },
    {
        permissionKey: "landline_phone",
        displayKey: "Teléfono fijo",
        field: "HAB.TELEFONO"
    },
    {
        permissionKey: "mobile_phone",
        displayKey: "Teléfono móvil",
        field: "HAB.TELEFONO_MOVIL"
    },
    {
        permissionKey: "fax_number",
        displayKey: "Número de fax",
        field: "HAB.FAX"
    },
    {
        permissionKey: "email",
        displayKey: "Correo electrónico",
        field: "HAB.EMAIL"
    },
    {
        permissionKey: "instruction_level",
        displayKey: "Nivel de estudios",
        field: "HAB.COD_NIVEL_INSTRUCCION",
        render: async (v :number) => await db.getAcademicLevelDescription(v)
    },
    {
        permissionKey: "father_name",
        displayKey: "Nombre del padre",
        field: "HAB.NOMBRE_PADRE"
    },
    {
        permissionKey: "mother_name",
        displayKey: "Nombre de la madre",
        field: "HAB.NOMBRE_MADRE"
    },
    {
        permissionKey: "is_protected",
        displayKey: "Protegid@",
        field: "HAB.ES_PROTEGIDO",
        render: (v :DBBinary | null) => utils.writeBoolean(v)
    },
    {
        permissionKey: "is_paralyzed",
        displayKey: "Paralizad@",
        field: "HAB.ES_PARALIZADO",
        render: (v :DBBinary | null) => utils.writeBoolean(v)
    },
    {
        permissionKey: "phonetic_name",
        displayKey: "Nombre fonético",
        field: "HAB.NOMBRE_FONETICO"
    },
    {
        permissionKey: "latinized_name",
        displayKey: "Nombre latinizado",
        field: "HAB.NOMBRE_LATIN"
    },
    {
        permissionKey: "latinized_surname_1",
        displayKey: "Apellido 1 latinizado",
        field: "HAB.APELLIDO1_LATIN"
    },
    {
        permissionKey: "latinized_surname_2",
        displayKey: "Apellido 2 latinizado",
        field: "HAB.APELLIDO2_LATIN"
    },
    {
        permissionKey: "address",
        displayKey: "Dirección",
        field: "VIV.ADDRESS"
    },
    {
        permissionKey: "postal_code",
        displayKey: "Código postal",
        field: "VIV.CODIGO_POSTAL"
    },
    {
        permissionKey: "municipality",
        displayKey: "Localidad",
        field: "VIV.NUCLEO_DISEMINADO_NOMBRE"
    }
];


export async function generateEntriesFor(idDoc :string, allowedKeys :string[]) {
    if(Object.keys(allowedKeys).length == 0) {
        return {
            success: false as const,
            unauthorized: true
        };
    }
    let selectedFields = ENTRIES.filter(e => allowedKeys.contains(e.permissionKey)).map(e => e.field).filter(utils.ensureNotNull);
    let query = await db.getInhabitantByIdDoc(idDoc, selectedFields);
    if(query.length == 0) {
        return {
            success: false as const,
            unauthorized: false
        };
    } else {
        return {
            success: true as const,
            idDoc: idDoc,
            fullName: await calculateValues(query, {field: "HAB.NOMBRE_COMPLETO"}, allowedKeys.contains("full_name")),
            entries: (await ENTRIES.filter(e => !e.hide).asyncMap(e => calculateValues(query, e, allowedKeys.contains(e.permissionKey))))
        };
    }
}


export function* getPermissionEntries() {
    for(let entry of ENTRIES) {
        if(!entry.permissionKey) {
            continue;
        }
        yield {
            permissionKey: entry.permissionKey,
            displayKey: entry.displayKey ?? entry.permissionKey
        };
    }
}


async function calculateValues(query :any, entry :any, hasPermission :boolean) {
    if(!hasPermission) {
        return {
            displayKey: entry.displayKey,
            displayValue: NO_PERMISSION_HTML,
            allowed: false,
            value: null
        };
    }
    let displayValue = "";
    let value :any = null;
    if(!!entry.field) {
        let effectiveField = entry.field.split('.').pop() as string;
        if(query.length == 0 || !query[0][effectiveField]) {
            value = null;
        } else {
            value = query[0][effectiveField];
        }
    }
    if(!!entry.render && value != null) {
        displayValue = await entry.render(value);
    } else {
        displayValue = value;
    }
    if(displayValue == null) {
        displayValue = NO_DATA_HTML;
    }
    return {
        displayKey: entry.displayKey,
        displayValue: displayValue,
        allowed: true,
        value: value
    };
}