import OracleDB from "oracledb";
import MySQL from "mysql2";
import * as properties from "./properties.js";


// Este módulo administra conexiones y consultas contra bases de datos. Antes de conectar a una base de datos es necesario usar el método "open" que corresponda.


let oracledb :OracleDB.Connection | null;
let oracledbCloseTimeout :NodeJS.Timeout | null; // Referencia al objecto timeout para cerrar la conexión. Se puede resetear el timeout.
let mysqldb :MySQL.Pool;

let mysqlSchema = ""; // Nombre del esquema según las propiedades. No se pueden cargar fuera de funciones.
let mysqldbLastRowCount = 0; // Cantidad de filas alteradas por la última consulta de MySQL.
                            // No siempre queremos actualizar este número, ya que algunas consultas (p.ej un SELECT simple) siempre indicará que se han actualizado 0 filas.


/** Abre una connection pool para MySQL, y crea las tablas requeridas si no existen. La connection pool cerrará las conexiones en desuso automáticamente. */
export async function openMySQL() {
    mysqlSchema = properties.get("MySQL.schema");
    await establishMySQLConnection();
    await initTables();
}


/** Garantiza que exista una conexión a OracleDB, si es posible. O bien se abre una conexión nueva, o bien se extiende el tiempo
 *  de vida de una conexión que ya exista. La conexión se cerrará en cuanto se complete el timeout.
 */
export async function openOracleDB() {
    let success :boolean;
    if(!!oracledb) {
        // Si ya hay una conexión, no crees otra. Basta con atrasar el cierre de la conexión que ya tenemos.
        resetCloseTimeout(closeOracleDB);
        return;
    }
    try {
        await establishOracleDBConnection();
        if(!!properties.get("Oracle.timeout-ms", 0)) { // Un valor de 0 o no definido indica que no hay timeout.
            oracledbCloseTimeout = setTimeout(closeOracleDB, properties.get<number>("Oracle.timeout-ms"));
        }
        success = true;
    } catch(e) {
        // No se pudo abrir una conexión a OracleDB.
        console.error(e.message);
        success = false;
    }
    return success;
}


/** Cierra inmediatamente la conexión a OracleDB. */
export async function closeOracleDB() {
    if(!oracledb) {
        // ¿No tenemos conexión? No hay nada que hacer.
        return;
    }
    await oracledb.close();
    oracledb = null;
    console.log("Conexión terminada con Oracle DB.");
    if(!!oracledbCloseTimeout) {
        clearTimeout(oracledbCloseTimeout);
        oracledbCloseTimeout = null;
    }
}


/** Cierra inmediatamente todas las conexiones a bases de datos. */
export async function closeAll() {
    await Promise.all([
        console.log(`La conexión con MySQL se cerrará automáticamente.`),
        closeOracleDB()
    ]);
}


/** Devuelve un nombre de tabla adaptado a MySQL, incluyendo el prefijo del esquema y el sufijo del entorno. Esta función debe usarse en lugar de nombres de
 *  tablas hardcodeados para garantizar que se utilizan en todo momento las tablas correspondientes al entorno actual. El prefijo del esquema se puede omitir
 *  al settear `prependSchema` a false.
 */
export function profileTable(tableName :string, prependSchema = true) {
    let suffix = properties.get<string>("MySQL.table-suffix", "");
    let ret = `${tableName}${!!suffix ? "_" : ""}${suffix ?? ""}`; // Solo se añade guión bajo si hay sufijo.
    if(prependSchema) {
        ret = `${mysqlSchema}${mysqlSchema.length > 0 ? '.' : ''}${ret}`; // Solo se añade punto si hay prefijo.
    }
    return ret;
}


/** Devuelve el número de filas que se actualizaron en la última consulta a MySQL donde `updateMetaResults` era true. */
export function getMySQLLastRowCount() {
    return mysqldbLastRowCount;
}


/** Ejecuta la consulta contra MySQL y devuelve el resultado. Antes de usar este método, es necesario crear una connection pool vía `openMySQL`. Al redactar
 *  la consulta, evite hardcodear el nombre de la tabla y use la función `profileTable` en su lugar. Si la consulta debe insertar, actualizar o borrar filas, settee
 *  `updateMetaResults` a true para poder obtener el número de filas actualizadas mediante `getMySQLLastRowCount`.
 */
export async function performQueryMySQL(query :string, updateMetaResults = false) :Promise<any> {
    return new Promise((resolve, reject) => {
        mysqldb.getConnection((error, connection) => {
            if(error) {
                // La pool no nos ha podido entregar una conexión.
                reject(error);
                return;
            }
            connection.query(query, (error, result) => {
                if(error) {
                    // La conexión funciona, pero la consulta no ha sido fructífera.
                    if(updateMetaResults) {
                        mysqldbLastRowCount = -1;
                    }
                    reject(error);
                } else {
                    if(updateMetaResults) {
                        // De acuerdo con la especificación de tipos de MySQL, el campo affectedRows se provee tras un número variable de capas de arrays.
                        // Ni sabemos ni nos interesa esta estructura. Este fragmento de código contempla todas las posibilidades.
                        if(result instanceof Array) {
                            if(result[0] instanceof Array) {
                                mysqldbLastRowCount = result[0][0].affectedRows;
                            } else {
                                mysqldbLastRowCount = result[0].affectedRows;
                            }
                        } else {
                            mysqldbLastRowCount = result.affectedRows;
                        }
                    }
                    resolve(result); // Devolvemos el resultado de la consulta, si ha tenido éxito. El caller se encargará de interpretarlo.
                }
                connection.release(); // En cualquier caso ya no necesitamos esta conexión.
            });
        });
    });
}


/** Realiza una consulta contra OracleDB. En principio, este programa no cuenta con permisos para insertar, alterar o borrar datos en OracleDB. */
export async function performQueryOracleDB(query :string) {
    if(!oracledb) {
        // Si no hay conexión, la abrimos.
        await openOracleDB();
    }
    if(!!oracledbCloseTimeout) {
        resetCloseTimeout(closeOracleDB); // Por si acaso, refrescamos la conexión de cara a otra posible consulta que venga inmediatamente después.
    }
    return oracledb!.execute(query);
}


/** Resetea el timeout de la conexión a OracleDB, si se ha proporcionado uno mediante las propiedades del servidor. */
function resetCloseTimeout(callback :() => void) {
    if(!!oracledbCloseTimeout) {
        // Si hay un timeout actual, lo cancelamos antes de sobreescribir su referencia con un nuevo timeout.
        clearTimeout(oracledbCloseTimeout);
    }
    oracledbCloseTimeout = setTimeout(callback, properties.get("Oracle.timeout-ms", 0));
}


/** Crea la conexión a OracleDB y lanza una consulta de prueba para verificar que funciona. Este método debe ejecutarse
 *  antes de realizar cualquier consulta contra OracleDB. La conexión se cerrará automáticamente cuando se cumpla el timeout.
 */
async function establishOracleDBConnection() {
    let ret :OracleDB.Connection;
    try {
        ret = await OracleDB.getConnection({
            connectionString: `(DESCRIPTION=(ADDRESS_LIST=
                    (ADDRESS=(PROTOCOL=${properties.get("Oracle.protocol", "TCP")})(HOST=${properties.get("Oracle.host")})(PORT=${properties.get("Oracle.port")})))
                    (CONNECT_DATA=${properties.get("Oracle.dedicated-server", false) ? "(SERVER=DEDICATED)" : ""}(SERVICE_NAME=ORCL)))`,
            user: properties.get<string>("Oracle.username"),
            password: properties.get<string>("Oracle.password")
        });
        console.log(`Conexión establecida con Oracle DB en ${properties.get("Oracle.host")}:${properties.get("Oracle.port")} como ${properties.get("Oracle.username")}.`);
    } catch(e) {
        throw new Error(`No se ha podido establecer la conexión con Oracle DB en ${properties.get("Oracle.host")}:${properties.get("Oracle.port")} como ${properties.get("Oracle.username")}. Causa: ${e}`);
    }
    try {
        // Consulta trivial para ver si OracleDB está respondiendo.
        console.log("Probando a realizar una consulta trivial con Oracle DB...");
        await ret.execute("SELECT COUNT(1) FROM ALL_TABLES");
        console.log("Consulta resuelta con Oracle DB.");
        oracledb = ret;
    } catch(e) {
        throw new Error(`Oracle DB no está resolviendo consultas. Causa: ${e}`);
    }
    return ret;
}


/** Crea la connection pool a MySQL y lanza una consulta de prueba para verificar que funciona. Este método debe ejecutarse
 *  antes de realizar cualquier consulta contra MySQL. El módulo de MySQL se encargará de cerrar las conexiones cuando dejemos de usarlas.
 */
async function establishMySQLConnection() {
    let ret = MySQL.createPool({
        connectionLimit: properties.get<number>("MySQL.connection-limit", 10),
        host: properties.get<string>("MySQL.host"),
        port: properties.get<number>("MySQL.port"),
        user: properties.get<string>("MySQL.username"),
        password: properties.get<string>("MySQL.password")
    });
    return new Promise<MySQL.Pool>((resolve, reject) => {
        console.log(`Probando a crear una conexión con MySQL en ${properties.get("MySQL.host")}:${properties.get("MySQL.port")} como ${properties.get("MySQL.username")}.`);
        // Consulta trivial para ver si MySQL está respondiendo.
        ret.query("SELECT 1", (error, result) => {
            if(error) {
                throw new Error(`No se ha podido crear una conexión con MySQL o no está resolviendo consultas. Causa: ${error}`);
            } else {
                console.log("Conexión verificada con MySQL.");
                mysqldb = ret;
                resolve(ret);
            }
        });
    });
}


/** Comprueba que existen en MySQL las tablas que requiere este programa, y las crea en caso negativo. */
async function initTables() {
    let rolesTable = profileTable("ROLES", false);
    let usersTable = profileTable("USERS", false);
    // Estas consultas devolverán el número de tablas "ROLES" y "USERS" que existan (debería ser 0 ó 1).
    let rolesTableExists = (await performQueryMySQL(`SHOW TABLES FROM ${mysqlSchema} LIKE '${rolesTable}'`)).length != 0;
    let usersTableExists = (await performQueryMySQL(`SHOW TABLES FROM ${mysqlSchema} LIKE '${usersTable}'`)).length != 0;

    if(!rolesTableExists || !usersTableExists) {
        console.log(`Se van a crear las tablas necesarias en MySQL.`);
        if(!rolesTableExists) {
            // No tenemos tabla de roles, hay que crearla.
            try {
                await performQueryMySQL(`
                    CREATE TABLE ${mysqlSchema}.${rolesTable} (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        name TEXT,
                        isDefault VARCHAR(1) NOT NULL DEFAULT 'F',
                        isAdmin VARCHAR(1) NOT NULL DEFAULT 'F',
                        parent INTEGER,
                        entries JSON,
                        CHECK(isDefault IN ('T', 'F')),
                        CHECK(isAdmin IN ('T', 'F')),
                        FOREIGN KEY(parent)
                            REFERENCES ${mysqlSchema}.${rolesTable}(id),
                        INDEX id_idx (id)
                    ) AUTO_INCREMENT = 101;
                `);
                console.log(`Tabla ${rolesTable} creada en MySQL.`);
            } catch(e) {
                throw new Error(`No se ha podido crear la tabla ${rolesTable} en MySQL. Causa: ${e}.`);
            }
        }
        if(!usersTableExists) {
            // No tenemos tabla de usuarios, hay que crearla.
            try {
                await performQueryMySQL(`
                    CREATE TABLE ${mysqlSchema}.${usersTable} (
                        id INTEGER PRIMARY KEY AUTO_INCREMENT,
                        username VARCHAR(30) UNIQUE,
                        role INTEGER,
                        isAuxiliar VARCHAR(1) NOT NULL DEFAULT 'F',
                        CHECK(isAuxiliar IN ('T', 'F')),
                        FOREIGN KEY(role)
                            REFERENCES ${mysqlSchema}.${rolesTable}(id),
                        INDEX id_idx (id),
                        INDEX username_idx (username)
                    ) AUTO_INCREMENT = 1001;
                `);
                console.log(`Tabla ${usersTable} creada en MySQL.`);
            } catch(e) {
                throw new Error(`No se ha podido crear la tabla ${usersTable} en MySQL. Causa: ${e}.`);
            }
        }
    }
}