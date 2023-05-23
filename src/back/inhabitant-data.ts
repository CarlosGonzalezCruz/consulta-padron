import * as db from "./db-queries.js";
import * as utils from "./utils.js";


const ENTRIES = [
    {
        displayKey: "Fecha de alta",
        field: "HAB.ALTA_MUNI_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        displayKey: "Fecha de nacimiento",
        field: "HAB.NACIM_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        displayKey: "Género",
        field: "HAB.SEXO_INE",
        render: (v :number) => v == 1 ? "Hombre" : v == 6 ? "Mujer" : "Otro"
    },
    {
        displayKey: "Teléfono fijo",
        field: "HAB.TELEFONO"
    },
    {
        displayKey: "Teléfono móvil",
        field: "HAB.TELEFONO_MOVIL"
    },
    {
        displayKey: "Número de fax",
        field: "HAB.FAX"
    },
    {
        displayKey: "Correo electrónico",
        field: "HAB.EMAIL"
    },
    {
        displayKey: "Nivel de estudios",
        field: "HAB.COD_NIVEL_INSTRUCCION",
        render: async (v :number) => await db.getAcademicLevelDescription(v)
    },
    {
        displayKey: "Nombre del padre",
        field: "HAB.NOMBRE_PADRE"
    },
    {
        displayKey: "Nombre de la madre",
        field: "HAB.NOMBRE_MADRE"
    },
    {
        displayKey: "Protegid@",
        field: "HAB.ES_PROTEGIDO",
        render: (v :'T' | 'F' | null) => utils.writeBoolean(v)
    },
    {
        displayKey: "Paralizad@",
        field: "HAB.ES_PARALIZADO",
        render: (v :'T' | 'F' | null) => utils.writeBoolean(v)
    },
    {
        displayKey: "Nombre fonético",
        field: "HAB.NOMBRE_FONETICO"
    },
    {
        displayKey: "Nombre latinizado",
        field: "HAB.NOMBRE_LATIN"
    },
    {
        displayKey: "Apellido 1 latinizado",
        field: "HAB.APELLIDO1_LATIN"
    },
    {
        displayKey: "Apellido 2 latinizado",
        field: "HAB.APELLIDO2_LATIN"
    },
    {
        displayKey: "Dirección",
        field: "VIV.ADDRESS"
    },
    {
        displayKey: "Código postal",
        field: "VIV.CODIGO_POSTAL"
    },
    {
        displayKey: "Localidad",
        field: "VIV.NUCLEO_DISEMINADO_NOMBRE"
    }
];


export async function generateEntriesFor(idDoc :string) {
    let selectedFields = ENTRIES.map(e => e.field).filter(utils.ensureNotNull);
    let query = await db.getInhabitantByIdDoc(idDoc, selectedFields);
    if(!query || query.length == 0) {
        return null;
    }
    return query != null ? {
        idDoc: idDoc,
        fullName: query[0]["NOMBRE_COMPLETO"],
        entries: await utils.asyncArrayMap(ENTRIES, async e => await calculateValues(query, e))
    }: null;
}


async function calculateValues(query :any, entry :any) {
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
        displayValue = `<span class="no-data-indicator">Sin datos</span>`;
    }
    return {
        displayKey: entry.displayKey,
        displayValue: displayValue,
        value: value
    };
}