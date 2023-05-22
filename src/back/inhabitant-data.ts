import * as db from "./db-queries.js";
import * as utils from "./utils.js";


const ENTRIES = [
    {
        displayKey: "Fecha de alta",
        field: "ALTA_MUNI_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        displayKey: "Fecha de nacimiento",
        field: "NACIM_FECHA",
        render: (v :Date) => utils.writeDate(v)
    },
    {
        displayKey: "Nivel de estudios",
        field: "COD_NIVEL_INSTRUCCION",
        render: async (v :number) => await db.getAcademicLevelDescription(v)
    }
];

export async function generateEntriesFor(idDoc :string) {
    let selectedFields = ENTRIES.map(e => e.field).filter(utils.ensureNotNull);
    let query = await db.getInhabitantByIdDoc(idDoc, selectedFields);
    if(!query || query.length == 0) {
        return null;
    }
    return query != null ? {
        fullName: query[0]["NOMBRE_COMPLETO"],
        entries: await utils.asyncArrayMap(ENTRIES, async e => await calculateValues(query, e))
    }: null;
}


async function calculateValues(query :any, entry :any) {
    let displayValue = "";
    let value :any = null;
    if(!!entry.field) {
        if(query.length == 0 || !query[0][entry.field]) {
            value = null;
        } else {
            value = query[0][entry.field];
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
        value: displayValue
    };
}