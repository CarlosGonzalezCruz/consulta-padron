import * as db from "./db-queries.js";
import * as utils from "./utils.js";

// Este módulo procesa y gestiona los datos de habitante que se pueden enviar al cliente web según los permisos del usuario.

/** Para mostrar en las entradas cuyo valor es nulo. */
const NO_DATA_HTML = `<span class="no-data-indicator">Sin datos</span>`;
/** Para mostrar en las entradas a las que el usuario no tiene permiso. */
const NO_PERMISSION_HTML = `<span class="not-allowed-indicator">Sin autorización</span>`;

/** Lista de todas las entradas disponibles. Cada entrada corresponde a una o varias columnas de la base de datos que se pueden consultar. */
const ENTRIES :EntryData[] = [
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
        permissionKey: "last_move_date",
        displayKey: "Fecha último movimiento",
        field: "MOV.FECHA_OCURRENCIA",
        render: (v :Date) => utils.writeDate(v) 
    },
    {
        permissionKey: "last_move_description",
        displayKey: "Razón último movimiento",
        field: "CNF_MOV.DESCRIPCION"
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


/** Devuelve una lista de las claves permitidas y sus valores correspondientes al habitante con el id proporcionado. */
export async function generateEntriesFor(idDoc :string, allowedKeys :string[]) {
    if(Object.keys(allowedKeys).length == 0) {
        // Si el usuario no tiene permiso para consultar absolutamente nada, no merece la pena hacer la consulta contra la base de datos.
        return {
            success: false as const,
            unauthorized: true
        };
    }

    // Se excluirán de la consulta las entradas no contempladas y las que no se tiene permiso.
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
            fullName: await calculateValues(query, ENTRIES.find(e => e.field == "HAB.NOMBRE_COMPLETO")!, allowedKeys.contains("full_name")),
            entries: (await ENTRIES.filter(e => !e.hide).asyncMap(e => calculateValues(query, e, allowedKeys.contains(e.permissionKey))))
        };
    }
}


/** Itera por todas las entradas disponibles. Cada entrada corresponde a una o varias columnas de la base de datos que se pueden consultar.  */
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


/** Prepara el valor de una entrada para mostrarlo al usuario. */
async function calculateValues(query :{[key :string] :any}, entry :EntryData, hasPermission :boolean) {
    if(!hasPermission) {
        // Sin permiso no hay mucho más que hacer.
        return {
            displayKey: entry.displayKey,
            displayValue: NO_PERMISSION_HTML,
            allowed: false,
            value: null
        };
    }

    // El displayValue es lo que va a ver el usuario en el cliente web. Coincidirá con el valor de la entrada excepto si la entrada
    // especifica una función render. El valor crudo también se proveerá por si el caller o el cliente web quiere hacer algo con ello.
    let displayValue = "";
    let value :any = null;

    if(!!entry.field) {
        // Los valores están almacenados en la query identificados con el nombre parcial de la columna, sin el prefijo de la tabla.
        // Primero quitamos el prefijo (quedándonos solo con lo que está después del último punto) y luego obtenemos el valor de la query
        // en base a eso.
        let effectiveField = entry.field.split('.').pop() as string;
        if(query.length == 0 || !query[0][effectiveField]) {
            value = null;
        } else {
            value = query[0][effectiveField];
        }
    }
    // Aquí asignamos el displayValue según si hay función de render o no.
    if(!!entry.render && value != null) {
        displayValue = (await entry.render(value)) as string;
    } else {
        displayValue = value;
    }
    // Si hemos asignado un null, usamos el formato para valores nulos que tenemos.
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