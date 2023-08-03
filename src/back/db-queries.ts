import { Result } from "oracledb";
import * as db from "./db-connection.js"
import * as utils from "./utils.js";


// Este módulo codifica todas las consultas a base de datos que se realizarán en el resto del programa.


/** Abre la connection pool a MySQL. */
export function openMySQL() {
    return db.openMySQL();
}

/** Abre una conexión a OracleDB, o refresca la conexión existente. */
export function openOracleDB() {
    return db.openOracleDB();
}

/** Cierra inmediatamente la conexión a OracleDB. */
export function closeOracleDB() {
    return db.closeOracleDB();
}

/** Cierra inmediatamente todas las conexiones a bases de datos. */
export function closeAll() {
    return db.closeAll();
}


/** Obtiene datos sobre un habitante según su Número Identificador a lo largo de todas las tablas de padrón disponibles. Solo se obtendrán los
 *  valores correspondientes a las columnas cuyo nombre se pase por parámetro vía `fields`.
 */
export async function getInhabitantByIdDoc(idDoc :string, fields :string[]) {
    if(fields.length == 0) {
        return [];
    }
    let result = await db.performQueryOracleDB(
        `
            SELECT ${fields.join(",")} FROM PMH_SIT_HABITANTE SIT
            LEFT JOIN PMH_HABITANTE HAB ON HAB.DBOID = SIT.HABITANTE_ID
            LEFT JOIN PMH_INSCRIPCION INS ON INS.DBOID = SIT.INSCRIPCION_ID
            LEFT JOIN PMH_MOVIMIENTO MOV ON MOV.DBOID = SIT.MOVIMIENTO_ID
            LEFT JOIN CNF_MOVIMIENTO_PMH CNF_MOV ON CNF_MOV.DBOID = MOV.TIPO_MOVIMIENTO_ID
            LEFT JOIN PMH_VIVIENDA VIV ON VIV.DBOID = SIT.VIVIENDA_ID
            WHERE HAB.DOC_IDENTIFICADOR = '${idDoc}' AND SIT.ES_ULTIMO = 'T'
            FETCH NEXT 1 ROWS ONLY
        `
    );
    return result.length > 0 ? result[0] : null;
}


/** Devuelve una descripción textual del nivel académico indicado. */
export async function getAcademicLevelDescription(id :number) {
    let result = await db.performQueryOracleDB(
        `
            SELECT DESCRIPCION FROM REPOS.PMH_NIV_INSTRUCCION_T
            WHERE DESCRIPCION LIKE '${id}%' AND VALIDATED=1
        `
    );
    let rows = result;
    if(!!rows && rows.length > 0) {
        return rows[0].DESCRIPCION as string;
    } else {
        return null;
    }
}


/** Convierte el resultado crudo de una consulta de OracleDB en un objeto `{clave: valor}` usable en Typescript. */
function mapOracleDBResult<T>(result :Result<T>) {
    let ret :{[k :string] :any}[] = [];
    // Los nombres de las columnas se proveen como metadatos, y los valores se proveen por separado de las columnas, pero en el mismo orden.
    for(let row of result.rows!) {
        let rowMap :{[k :string] :T} = {};
        // @ts-ignore row siempre es un Array pero la especificación de tipos de Oracle no está de acuerdo.
        let rowItems :T[] = row;
        for(let i = 0; i < rowItems.length; i++) {
            rowMap[result.metaData![i].name] = rowItems[i];
        }
        ret.push(rowMap);
    }
    return ret;
}


/** Devuelve los datos de la cuenta asignada al administrador auxiliar. */
export async function getAuxAdmin() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE isAuxiliar='T';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve los datos del usuario con el id proporcionado. */
export async function getUser(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE id='${id}';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve los datos del usuario con el nombre de usuario proporcionado. */
export async function getUserByUsername(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} WHERE username='${username}';
    `) as User[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve una lista con el id y el nombre de todos los usuarios registrados. */
export async function getAllUsers() {
    let result = await db.performQueryMySQL(`
        SELECT id, username FROM ${db.profileTable("USERS")} ORDER BY username;
    `) as {id :number, username :string}[];
    return result;
}


/** Devuelve los datos del rol con el id proporcionado. */
export async function getRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE id='${id}';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve una lista con el id y nombre de todos los roles. */
export async function getAllRoles() {
    let result = await db.performQueryMySQL(`
        SELECT id, name FROM ${db.profileTable("ROLES")} ORDER BY name;
    `) as {id :number, name :string}[];
    return result;
}


/** Devuelve los datos del rol marcado como predeterminado. */
export async function getDefaultRole() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE isDefault='T';
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


/** Cambia el rol predeterminado. El rol correspondiente al id proporcionado pasará a ser el predeterminado, y se le quitará esa
 *  propiedad al rol que anteriormente era el predeterminado. Para evitar un estado en el que no exista un rol predeterminado,
 *  este método no hará nada si el id indicado no corresponde a un rol que existe.
 *  @returns true si el id indicado no corresponde a un rol que exista.
 */
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


/** Asigna o desasigna el estatus de administrador a un rol. */
export async function setAdminRole(roleId :number, isAdmin :boolean) {
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("ROLES")} SET isAdmin='${isAdmin ? 'T' : 'F'}' WHERE id=${roleId};
    `);
}


/** Devuelve una lista con el id y el nombre de todos los usuarios que tengan el rol correspondiente al id indicado. */
export async function getAllUsersWithRole(roleId :number) {
    let result = await db.performQueryMySQL(`
        SELECT U.id, U.username FROM ${db.profileTable("USERS")} U
        INNER JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE R.id=${roleId};
    `) as {id :number, username :string}[];
    return result;
}


/** Cambia la cuenta de usuario auxiliar a la correspondiente al id proporcionado. La cuenta auxiliar será accesible mediante las
 *  credenciales de administrador auxiliar descritas en las propiedades del servidor, y siempre será administrador independientemente
 *  de su rol. Este método NO garantiza que el id proporcionado corresponda a un usuario que exista antes de actuar.
 */
export async function setAuxiliar(userId :number) {
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("USERS")} SET isAuxiliar='F' WHERE isAuxiliar='T';
    `);
    await db.performQueryMySQL(`
        UPDATE ${db.profileTable("USERS")} SET isAuxiliar='T' WHERE id=${userId};
    `);
}


/** Devuelve los datos del usuario con el id indicado, así como los datos de su rol. */
export async function getUserRole(userId :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} U
        LEFT JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE U.id='${userId}';
    `) as (User & Role)[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve los datos del usuario con el nombre indicado, así como los datos de su rol. */
export async function getUserRoleByUsername(username :string) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("USERS")} U
        LEFT JOIN ${db.profileTable("ROLES")} R ON U.role=R.id
        WHERE U.Username='${username}';
    `) as (User & Role)[];
    return result.length > 0 ? result[0] : null;
}


/** Devuelve la cantidad de roles que existen. */
async function getRoleCount() {
    let result = await db.performQueryMySQL(`
        SELECT COUNT(1) AS COUNT FROM ${db.profileTable("ROLES")};
    `) as {COUNT :number}[];
    return result[0].COUNT;
}


/** Crea una cuenta de usuario con el nombre y el rol indicados. */
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


/** Elimina el usuario que corresponda al id proporcionado.  */
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


/** Cambia el nombre del usuario correspondiente al id proporcionado. La consulta fallará si se ha intentado asignar un nombre que ya
 *  posea otro usuario.
 */
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


/** Cambia el rol del usuario correspondiente al id proporcionado por el rol correspondiente al id indicado. La consulta fallará si se ha intentado 
 *  asignar un rol que no exista.
 */
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


/** Crea un rol con el nombre, los permisos iniciales y el rol base que se indiquen. */
export async function createRole(name :string, initialPermissions :RolePermissions, parentRoleId :number | null = null) {
    try {
        let isFirstRole = (await getRoleCount()) == 0; // Si no hay más roles, este es el primero y por tanto el predeterminado.
        await db.performQueryMySQL(`
            INSERT INTO ${db.profileTable("ROLES")}(name, isDefault, isAdmin, parent, entries)
            VALUES ('${name}', '${isFirstRole ? 'T' : 'F'}', 'F', ${parentRoleId}, '${JSON.stringify(initialPermissions)}');
        `, true);
        console.log(`Creado rol ${name}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al crear el rol. Causa: ${e}`);
    }
}


/** Obtiene los datos del rol de más reciente creación. */
export async function getLastCreatedRole() {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} ORDER BY id DESC LIMIT 1
    `) as Role[];
    return result.length > 0 ? result[0] : null;
}


/** Cambia el nombre del rol correspondiente al id proporcionado. */
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


/** Cambia los permisos para consultar entradas para este rol. */
export async function updateRolePermissions(id :number, permissions: RolePermissions) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} SET entries='${JSON.stringify(permissions)}' WHERE id=${id};
        `);
        console.log(`Se ha actualizado los permisos del rol ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al actualizar los permisos del rol. Causa: ${e}`);
    }
}


/** Devuelve una lista con los datos de todos los roles que tengan al rol indicado como rol base. */
export async function getAllChildrenOfRole(id :number) {
    let result = await db.performQueryMySQL(`
        SELECT * FROM ${db.profileTable("ROLES")} WHERE parent=${id};
    `) as Role[];
    return result;
}


/** Cambia el rol sobre el que se basa el rol indicado. Un rol puede no tener base. Sin embargo, no está permitido crear cadenas donde un rol es,
 *  de forma directa o indirecta, su propia base (dependencia cíclica). La consulta fallará si, dados los parámetros, se produciría esta situación.
 *  @returns true si la base del rol se ha podido cambiar sin generar una dependencia cíclica, false en otro caso.
 */
export async function updateRoleParent(id :number, parentId :number | null) {
    let successWithoutCycles = false;
    try {
        if(parentId != null && await isRoleInParentChain(parentId, id)) {
            // Aquí se ha intentado asignar como base un rol que ya depende del rol actual, creando la dependencia cíclica.
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


/** Cambia todos los roles derivados del rol indicado de manera que pasen a tener la misma base que el rol indicado. Es decir, si tenemos 
 *  una jerarquía de roles tal que A → B → C, y disolvemos B, pasaremos a tener A → B y A → C.
 */
export async function dissolveRoleParent(id :number) {
    try {
        await db.performQueryMySQL(`
            UPDATE ${db.profileTable("ROLES")} R, (SELECT id, parent FROM ${db.profileTable("ROLES")}) P SET R.parent = P.parent WHERE R.parent=${id} AND P.id=${id};
        `);
        console.log(`Se ha actualizado la jerarquía del rol ${id}`);
    } catch(e) {
        console.error(`Ha ocurrido un problema al actualizar la jerarquía del rol. Causa: ${e}`);
    }
}


/** Elimina el rol correspondiente al id proporcionado. Si hay al menos una cuenta de usuario con el rol eliminado, es necesario proveer también un
 *  nuevo rol para dicha cuenta mediante `replaceWithRoleId`. Si hay usuarios afectados y no se indica un valor no nulo para
 *  `replaceWithRoleId`, la consulta fallará.
 */
export async function deleteRole(id :number, replaceWithRoleId :number | null) {
    try {
        // Existe una foreign key constraint de USERS a ROLES que provocará el fallo que se menciona en la descripción. Para evitarlo, primero cambiamos
        // los roles de los usuarios afectados, y luego borramos el rol.
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


/** Partiendo del rol correspondiente al id `startingId`, recorreremos la cadena de roles base en busca del rol correspondiente al id `searchingId`.
 *  La búsqueda concluirá cuando se encuentre o cuando se llegue al final de la cadena, es decir, un rol sin base.
 *  @returns true si se ha encontrado el rol que se estaba buscando, false si se ha llegado al final de la cadena sin encontrarlo.
 */
async function isRoleInParentChain(startingId :number, searchingId :number) {
    if(startingId == searchingId) {
        // Si el rol que buscamos es el rol en el que hemos empezado, no hace falta buscar más.
        return true;
    }
    let current :number | null = startingId;
    do {
        let currentRole = await getRole(current) as Role;
        let parent = currentRole!.parent;
        if(parent == searchingId) {
            // La base del rol actual es el rol que buscamos. Encontrado.
            return true;
        }
        current = parent; // Por ahora no hemos dado con el rol que buscamos. Subamos un paso la cadena y repitamos el proceso.
    } while(current != null); // El bucle se romperá cuando hayamos dado con un rol que no tenga base.
    // Hemos llegado al final sin encontrar nada.
    return false;
}


export async function getAmountOfInhabitants() {
    let result = await db.performQueryOracleDB(`
        SELECT COUNT(*) AS COUNT FROM PMH_SIT_HABITANTE; 
    `) as {COUNT :number}[];

    return result.length == 0 ? 0 : result[0].COUNT;
}


export async function insertShowcaseInhabitant(inhabitant :Inhabitant) {
    let isRegistered = inhabitant.isRegistered === null ? "NULL" : inhabitant.isRegistered;
    let registrationDate = inhabitant.registrationDate === null ? "NULL" : `'${inhabitant.registrationDate}'`;
    let birthDate = inhabitant.birthDate === null ? "NULL" : `'${inhabitant.birthDate}'`;
    let gender = inhabitant.gender === null ? "NULL" : `'${inhabitant.gender}'`;
    let landlinePhone = inhabitant.landlinePhone === null ? "NULL" : `'${inhabitant.landlinePhone}'`;
    let mobilePhone = inhabitant.mobilePhone === null ? "NULL" : `'${inhabitant.mobilePhone}'`;
    let faxNumber = inhabitant.faxNumber === null ? "NULL" : `'${inhabitant.faxNumber}'`;
    let email = inhabitant.email === null ? "NULL" : `'${inhabitant.email}'`;
    let instructionLevel = inhabitant.instructionLevel === null ? "NULL" : inhabitant.instructionLevel;
    let lastMoveDate = inhabitant.lastMoveDate === null ? "NULL" : `'${inhabitant.lastMoveDate}'`;
    let lastMoveType = inhabitant.lastMoveType === null ? "NULL" : `${inhabitant.lastMoveType}`;
    let fatherName = inhabitant.fatherName === null ? "NULL" : `'${inhabitant.fatherName}'`;
    let motherName = inhabitant.motherName === null ? "NULL" : `'${inhabitant.motherName}'`;
    let isProtected = inhabitant.isProtected === null ? "NULL" : inhabitant.isProtected;
    let isParalyzed = inhabitant.isParalyzed === null ? "NULL" : inhabitant.isParalyzed;
    let phoneticName = inhabitant.phoneticName === null ? "NULL" : `'${inhabitant.phoneticName}'`;
    let latinizedName = inhabitant.latinizedName === null ? "NULL" : `'${inhabitant.latinizedName}'`;
    let latinizedSurname1 = inhabitant.latinizedSurname1 === null ? "NULL" : `'${inhabitant.latinizedSurname1}'`;
    let latinizedSurname2 = inhabitant.latinizedSurname2 === null ? "NULL" : `'${inhabitant.latinizedSurname2}'`;
    let address = inhabitant.address === null ? "NULL" : `'${inhabitant.address}'`;
    let postalCode = inhabitant.postalCode === null ? "NULL" : `'${inhabitant.postalCode}'`;
    let municipality = inhabitant.municipality === null ? "NULL" : `'${inhabitant.municipality}'`;

    await db.performQueryOracleDB(`INSERT INTO PMH_HABITANTE (NOMBRE_COMPLETO, DOC_IDENTIFICADOR, ALTA_MUNI_FECHA, NACIM_FECHA, SEXO_INE, TELEFONO, TELEFONO_MOVIL, FAX, EMAIL, COD_NIVEL_INSTRUCCION, NOMBRE_PADRE, NOMBRE_MADRE, ES_PROTEGIDO, ES_PARALIZADO, NOMBRE_FONETICO, NOMBRE_LATIN, APELLIDO1_LATIN, APELLIDO2_LATIN) VALUES ('${inhabitant.fullName}', '${inhabitant.idDoc}', ${registrationDate}, ${birthDate}, ${gender}, ${landlinePhone}, ${mobilePhone}, ${faxNumber}, ${email}, ${instructionLevel}, ${fatherName}, ${motherName}, ${isProtected}, ${isParalyzed}, ${phoneticName}, ${latinizedName}, ${latinizedSurname1}, ${latinizedSurname2})`);
    await db.performQueryOracleDB(`INSERT INTO PMH_INSCRIPCION () VALUES ()`);
    await db.performQueryOracleDB(`INSERT INTO PMH_MOVIMIENTO (TIPO_MOVIMIENTO_ID, FECHA_OCURRENCIA) VALUES (${lastMoveType}, ${lastMoveDate})`);
    await db.performQueryOracleDB(`INSERT INTO PMH_VIVIENDA (NUCLEO_DISEMINADO_NOMBRE, CODIGO_POSTAL, ADDRESS) VALUES (${municipality}, ${postalCode}, ${address})`);

    let currentDboids = {
        "habitante": await db.performQueryOracleDB("SELECT LAST_INSERT_ROWID() FROM PMH_HABITANTE"),
        "inscripcion": await db.performQueryOracleDB("SELECT LAST_INSERT_ROWID() FROM PMH_INSCRIPCION"),
        "movimiento": await db.performQueryOracleDB("SELECT LAST_INSERT_ROWID() FROM PMH_MOVIMIENTO"),
        "vivienda": await db.performQueryOracleDB("SELECT LAST_INSERT_ROWID() FROM PMH_VIVIENDA"),
    };

    await db.performQueryOracleDB(`INSERT INTO PMH_SIT_HABITANTE (HABITANTE_ID, INSCRIPCION_ID, MOVIMIENTO_ID, VIVIENDA_ID, ES_ULTIMO, ES_VIGENTE) VALUES
        (${currentDboids.habitante}, ${currentDboids.inscripcion}, ${currentDboids.movimiento}, ${currentDboids.vivienda}, 'T', ${isRegistered})
    `);
}
