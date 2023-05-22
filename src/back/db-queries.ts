import { Result } from "oracledb";
import * as db from "./db-connection.js"


export function openOracleDB() {
    return db.openOracleDB();
}

export function closeOracleDB() {
    return db.closeOracleDB();
}

export function closeAll() {
    return db.closeAll();
}


export async function getInhabitantByIdDoc(idDoc :string, fields :string[]) {
    let result = await db.performQueryOracleDB(
        `
            SELECT NOMBRE_COMPLETO,${fields.join(",")} FROM REPOS.PMH_HABITANTE
            WHERE DOC_IDENTIFICADOR = '${idDoc}' AND ES_ULTIMO = 'T'
            FETCH NEXT 1 ROWS ONLY
        `
    );
    return mapOracleDBResult(result);
}


export async function getAcademicLevelDescription(id :number) {
    let result = await db.performQueryOracleDB(
        `
            SELECT DESCRIPCION FROM REPOS.PMH_NIV_INSTRUCCION_T
            WHERE DESCRIPCION LIKE '${id}%' AND VALIDATED=1
        `
    );
    let rows = mapOracleDBResult(result);
    if(!!rows && rows.length > 0) {
        return rows[0].DESCRIPCION as string;
    } else {
        return null;
    }
}


function mapOracleDBResult<T>(result :Result<T> | null) {
    if(result == null) {
        return null;
    }
    let ret :any[] = [];
    for(let row of result.rows!) {
        let rowMap :any = {};
        // @ts-ignore row is always an Array of items but Oracle's type hinting disagrees
        let rowItems :T[] = row;
        for(let i = 0; i < rowItems.length; i++) {
            rowMap[result.metaData![i].name] = rowItems[i];
        }
        ret.push(rowMap);
    }
    return ret;
}