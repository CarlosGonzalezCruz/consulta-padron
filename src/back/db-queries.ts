import { Result } from "oracledb";
import * as db from "./db-connection.js"


export function openMySQL() {
    return db.openMySQL();
}

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
            SELECT NOMBRE_COMPLETO,${fields.join(",")} FROM REPOS.PMH_SIT_HABITANTE SIT
            LEFT JOIN REPOS.PMH_HABITANTE HAB ON HAB.DBOID = SIT.HABITANTE_ID
            LEFT JOIN REPOS.PMH_INSCRIPCION INS ON INS.DBOID = SIT.INSCRIPCION_ID
            LEFT JOIN REPOS.PMH_MOVIMIENTO MOV ON MOV.DBOID = SIT.MOVIMIENTO_ID
            LEFT JOIN REPOS.PMH_VIVIENDA VIV ON VIV.DBOID = SIT.VIVIENDA_ID
            WHERE HAB.DOC_IDENTIFICADOR = '${idDoc}' AND SIT.ES_ULTIMO = 'T'
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


export async function getUser(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE username='${username}';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


export async function getRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE id='${id}';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


export async function getDefaultRole() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE isDefault='T';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


export async function setDefaultRole(roleId :number) {
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isDefault='F' WHERE isDefault='T';
    `);
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isDefault='T' WHERE id=${roleId};
    `);
}


export async function getUserRole(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} U
        LEFT JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE U.Username='${username}';
    `) as (User & Role)[];
    return result.length > 0 ? result[0] : null;
}


async function getRoleCount() {
    let result = await db.performQueryMySQL(`
        SELECT COUNT(1) FROM ${db.profileTable("ROLES")};
    `) as number[];
    return result.length > 0 ? result[0] : 0;
}


export async function createUser(username :string, roleId :number) {
    try {
        await db.performQueryMySQL(`
            INSERT INTO ${db.profileTable("USERS")}(username, role) VALUES ('${username}', ${roleId});
        `, true);
        console.log(`Creado usuario para ${username}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al crear el usuario. Causa: ${e}`);
    }
}


export async function createRole(name :string) {
    try {
        let isFirstRole = await getRoleCount();
        await db.performQueryMySQL(`
            INSERT INTO ${db.profileTable("ROLES")}(name, isDefault, isAdmin)
            VALUES ('${name}', '${isFirstRole ? 'T' : 'F'}', 'F');
        `, true);
        console.log(`Creado rol ${name}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al crear el rol. Causa: ${e}`);
    }
}


