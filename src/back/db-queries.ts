import { Result } from "oracledb";
import * as db from "./db-connection.js"
import * as utils from "./utils.js";


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
    if(fields.length == 0) {
        return [];
    }
    let result = await db.performQueryOracleDB(
        `
            SELECT ${fields.join(",")} FROM REPOS.PMH_SIT_HABITANTE SIT
            LEFT JOIN REPOS.PMH_HABITANTE HAB ON HAB.DBOID = SIT.HABITANTE_ID
            LEFT JOIN REPOS.PMH_INSCRIPCION INS ON INS.DBOID = SIT.INSCRIPCION_ID
            LEFT JOIN REPOS.PMH_MOVIMIENTO MOV ON MOV.DBOID = SIT.MOVIMIENTO_ID
            LEFT JOIN REPOS.CNF_MOVIMIENTO_PMH CNF_MOV ON CNF_MOV.DBOID = MOV.TIPO_MOVIMIENTO_ID
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


function mapOracleDBResult<T>(result :Result<T>) {
    let ret :any[] = [];
    for(let row of result.rows!) {
        let rowMap :{[k :string] :T} = {};
        // @ts-ignore row is always an Array of items but Oracle's type hinting disagrees
        let rowItems :T[] = row;
        for(let i = 0; i < rowItems.length; i++) {
            rowMap[result.metaData![i].name] = rowItems[i];
        }
        ret.push(rowMap);
    }
    return ret;
}


export async function getAuxAdmin() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE isAuxiliar='T';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


export async function getUser(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE id='${id}';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


export async function getUserByUsername(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE username='${username}';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


export async function getAllUsers() {
    let result = await db.performQueryMySQL(`
        SELECT id, username FROM ${db.profileTable("USERS")} ORDER BY username;
    `) as {id :number, username :string}[];
    return result;
}


export async function getRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE id='${id}';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


export async function getAllRoles() {
    let result = await db.performQueryMySQL(`
        SELECT id, name FROM ${db.profileTable("ROLES")} ORDER BY name;
    `) as {id :number, name :string}[];
    return result;
}


export async function getDefaultRole() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE isDefault='T';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


export async function setDefaultRole(roleId :number) {
    let roleNotFound = false;
    if(await getRole(roleId) == null) {
        roleNotFound = true;
        return roleNotFound;
    }
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isDefault='F' WHERE isDefault='T';
    `);
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isDefault='T' WHERE id=${roleId};
    `);
    return roleNotFound;
}


export async function setAdminRole(roleId :number, isAdmin :boolean) {
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isAdmin='${isAdmin ? 'T' : 'F'}' WHERE id=${roleId};
    `);
}


export async function getAllUsersWithRole(roleId :number) {
    let result = await db.performQueryMySQL(`
        SELECT U.id, U.username FROM ${db.profileTable("USERS")} U
        INNER JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE R.id=${roleId};
    `) as {id :number, username :string}[];
    return result;
}


export async function setAuxiliar(userId :number) {
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("USERS")} SET isAuxiliar='F' WHERE isAuxiliar='T';
    `);
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("USERS")} SET isAuxiliar='T' WHERE id=${userId};
    `);
}


export async function getUserRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} U
        LEFT JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE U.id='${id}';
    `) as (User & Role)[];
    return result.length > 0 ? result[0] : null;
}


export async function getUserRoleByUsername(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} U
        LEFT JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE U.Username='${username}';
    `) as (User & Role)[];
    return result.length > 0 ? result[0] : null;
}


async function getRoleCount() {
    let result = await db.performQueryMySQL(`
        SELECT COUNT(1) AS COUNT FROM ${db.profileTable("ROLES")};
    `) as {COUNT :number}[];
    return result[0].COUNT;
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


export async function deleteUser(id :number) {
    try {
        await db.performQueryMySQL(`
            DELETE FROM ${db.profileTable("USERS")} WHERE id=${id};
        `, true);
        console.log(`Eliminado usuario con id ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al eliminar el usuario. Causa: ${e}`);
    }
}


export async function updateUserUsername(id :number, newName :string) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("USERS")} SET username='${newName}' WHERE id=${id};
        `, true);
        console.log(`Cambiado usuario ${id} a ${newName}`);
        return {success: true as const};
    } catch(e) {
        console.error(`Ha ocurrido un problema al cambiar el nombre del usuario. Causa: ${e}`);
        return {success: false as const};
    }
}


export async function updateUserRole(userId :number, roleId :number) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("USERS")} SET role=${roleId} WHERE id=${userId};
        `, true);
        console.log(`Cambiado usuario ${userId} a rol ${roleId}`);
        return {success: true as const};
    } catch(e) {
        console.error(`Ha ocurrido un problema al cambiar el rol del usuario. Causa: ${e}`);
        return {success: false as const};
    }
}


export async function createRole(name :string, initialPermissions :any, parentRoleId :number | null = null) {
    try {
        let isFirstRole = (await getRoleCount()) == 0;
        let permissions = utils.jsonToBuffer(initialPermissions);
        await db.performQueryMySQL(`
            INSERT INTO ${db.profileTable("ROLES")}(name, isDefault, isAdmin, parent, entries)
            VALUES ('${name}', '${isFirstRole ? 'T' : 'F'}', 'F', ${parentRoleId}, '${permissions}');
        `, true);
        console.log(`Creado rol ${name}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al crear el rol. Causa: ${e}`);
    }
}


export async function getLastCreatedRole() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} ORDER BY id DESC LIMIT 1
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


export async function updateRoleName(id :number, newName :string) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} SET name="${newName}" WHERE id=${id};
        `);
        console.log(`Se ha actualizado el nombre del rol ${id} a "${newName}"`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al renombrar el rol. Causa: ${e}`);
    }
}


export async function updateRolePermissions(id :number, permissions: any) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} SET entries='${JSON.stringify(permissions)}' WHERE id=${id};
        `);
        console.log(`Se ha actualizado los permisos del rol ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al actualizar los permisos del rol. Causa: ${e}`);
    }
}


export async function getAllChildrenOfRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE parent=${id};
    `) as Role[];
    return result;
}


export async function updateRoleParent(id :number, parentId :number | null) {
    let successWithoutCycles = false;
    try {
        if(parentId != null && await isRoleInParentChain(parentId, id)) {
            successWithoutCycles = false;
            throw new Error("Se crearía una dependencia cíclica entre roles.");
        }
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} SET parent=${parentId} WHERE id=${id};
        `);
        console.log(`Se ha actualizado la jerarquía del rol ${id}`);
        successWithoutCycles = true;
    } catch(e) {
        console.error(`Ha ocurrido un problema al actualizar la jerarquía del rol. Causa: ${e}`);
    }
    return successWithoutCycles;
}


export async function dissolveRoleParent(id :number) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} SET parent=(SELECT parent FROM ${db.profileTable("ROLES")} WHERE id=${id}) WHERE parent=${id};
        `);
        console.log(`Se ha actualizado la jerarquía del rol ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al actualizar la jerarquía del rol. Causa: ${e}`);
    }
}


export async function deleteRole(id :number, replaceWithRoleId :number | null) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("USERS")} SET role=${replaceWithRoleId} WHERE role=${id};
        `, true);
        await db.performQueryMySQL(`
            DELETE FROM ${db.profileTable("ROLES")} WHERE id=${id} AND isDefault='F';
        `, true);
        console.log(`Eliminado rol con id ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al eliminar el rol. Causa: ${e}`);
    }
}


async function isRoleInParentChain(startingId :number, avoidingId :number) {
    if(startingId == avoidingId) {
        return true;
    }
    let current :number | null = startingId;
    do {
        let currentRole = await getRole(current) as Role;
        let parent = currentRole!.parent;
        if(parent == avoidingId) {
            return true;
        }
        current = parent;
    } while(current != null);
    return false;
}
