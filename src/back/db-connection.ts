import OracleDB from "oracledb";
import MySQL from "mysql2";
import * as properties from "./properties.js";


let oracledb :OracleDB.Connection | null;
let oracledbCloseTimeout :NodeJS.Timeout | null;
let mysqldb :MySQL.Pool;

let mysqlSchema = "";
let mysqldbLastRowCount = 0;


export async function openMySQL() {
    mysqlSchema = properties.get("MySQL.schema");
    await establishMySQLConnection();
    await initTables();
}


export async function openOracleDB() {
    let success :boolean;
    if(!!oracledb) {
        resetCloseTimeout(closeOracleDB);
        return;
    }
    try {
        await establishOracleDBConnection();
        if(!!properties.get("Oracle.timeout-ms", 0)) {
            oracledbCloseTimeout = setTimeout(closeOracleDB, properties.get<number>("Oracle.timeout-ms"));
        }
        success = true;
    } catch(e) {
        console.error(e.message);
        success = false;
    }
    return success;
}


export async function closeOracleDB() {
    if(!oracledb) {
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


export async function closeAll() {
    await Promise.all([
        console.log(`La conexión con MySQL se cerrará automáticamente.`),
        closeOracleDB()
    ]);
}


export function profileTable(tableName :string, prependSchema = true) {
    let suffix = properties.get<string>("MySQL.table-suffix", "");
    let ret = `${tableName}${!!suffix ? "_" : ""}${suffix ?? ""}`;
    if(prependSchema) {
        ret = `${mysqlSchema}${mysqlSchema.length > 0 ? '.' : ''}${ret}`;
    }
    return ret;
}


export function getMySQLLastRowCount() {
    return mysqldbLastRowCount;
}


export async function performQueryMySQL(query :string, updateMetaResults = false) :Promise<any> {
    return new Promise((resolve, reject) => {
        mysqldb.getConnection((error, connection) => {
            if(error) {
                reject(error);
                return;
            }
            connection.query(query, (error, result) => {
                if(error) {
                    mysqldbLastRowCount = -1;
                    reject(error);
                } else {
                    if(updateMetaResults) {
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
                    resolve(result);
                }
                connection.release();
            });
        });
    });
}


export async function performQueryOracleDB(query :string) {
    if(!oracledb) {
        await openOracleDB();
    }
    if(!!oracledbCloseTimeout) {
        resetCloseTimeout(closeOracleDB);
    }
    return oracledb!.execute(query);
}


function resetCloseTimeout(callback :() => void) {
    if(!!oracledbCloseTimeout) {
        clearTimeout(oracledbCloseTimeout);
    }
    oracledbCloseTimeout = setTimeout(callback, properties.get("Oracle.timeout-ms", 0));
}


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
        // Trivial query to verify whether Oracle DB is resolving queries at all
        console.log("Probando a realizar una consulta trivial con Oracle DB...");
        await ret.execute("SELECT COUNT(1) FROM ALL_TABLES");
        console.log("Consulta resuelta con Oracle DB.");
        oracledb = ret;
    } catch(e) {
        throw new Error(`Oracle DB no está resolviendo consultas. Causa: ${e}`);
    }
    return ret;
}


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
        // Trivial query to verify whether MySQL is resolving queries at all
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


async function initTables() {
    let rolesTable = profileTable("ROLES", false);
    let usersTable = profileTable("USERS", false);
    let rolesTableExists = (await performQueryMySQL(`SHOW TABLES FROM ${mysqlSchema} LIKE '${rolesTable}'`)).length != 0;
    let usersTableExists = (await performQueryMySQL(`SHOW TABLES FROM ${mysqlSchema} LIKE '${usersTable}'`)).length != 0;

    if(!rolesTableExists || !usersTableExists) {
        console.log(`Se van a crear las tablas necesarias en MySQL.`);
        if(!rolesTableExists) {
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