import OracleDB from "oracledb";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import * as properties from "./properties.js";

const DB_PATH = "./db/permissions.db";

let oracledb :OracleDB.Connection | null;
let oracledbCloseTimeout :NodeJS.Timeout | null;
let sqlitedb :sqlite3.Database;

let sqliteLastRowCount = 0;
let sqliteLastInsertedId = -1;


export function openMySQL() {
    return new Promise<void>((resolve, reject) => {
        if(!fs.existsSync(path.dirname(DB_PATH))) {
            fs.mkdirSync(path.dirname(DB_PATH));
        }

        sqlitedb = new sqlite3.Database(DB_PATH, error => {
            if(error) {
                reject(error);
            }
            console.log(`Conectado a ${DB_PATH}`);
            initTables();
        });
        resolve();
    });
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
        closeOracleDB(),
        new Promise<void>(r => { sqlitedb.close(); r() })
    ]);
}


export function profileTable(tableName :string) {
    let suffix = properties.get<string>("MySQL.table-suffix", "");
    return `${tableName}${!!suffix ? "_" : ""}${suffix ?? ""}`;
}


export function getMySQLLastRowCount() {
    return sqliteLastRowCount;
}


export function getMySQLLastInsertedId() {
    return sqliteLastInsertedId;
}


export async function performQueryMySQL(query :string, updateMetaResults = false) :Promise<any> {
    return new Promise((resolve, reject) => {
        sqlitedb.all(query, (error, result :any) => {
            if(error) {
                sqliteLastRowCount = -1;
                reject(error);
            } else {
                if(updateMetaResults) {
                    sqliteLastRowCount = result.affectedRows;
                    console.info(`Last row count updated to ${sqliteLastRowCount}`)
                    sqliteLastInsertedId = result.insertId;
                }
                resolve(result);
            }
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


async function initTables() {
    let rolesTable = profileTable("ROLES");
    let usersTable = profileTable("USERS");
    let rolesTableExists = (await performQueryMySQL(`SELECT NAME FROM SQLITE_MASTER WHERE TYPE='table' AND NAME='${rolesTable}'`)).length != 0;
    let usersTableExists = (await performQueryMySQL(`SELECT NAME FROM SQLITE_MASTER WHERE TYPE='table' AND NAME='${usersTable}'`)).length != 0;

    if(!rolesTableExists || !usersTableExists) {
        console.log(`Se van a crear las tablas necesarias en MySQL.`);
        if(!rolesTableExists) {
            try {
                await performQueryMySQL(`
                    CREATE TABLE ${rolesTable} (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT
                    );
                `);
                console.log(`Tabla ${rolesTable} creada en MySQL.`);
            } catch(e) {
                throw new Error(`No se ha podido crear la tabla ${rolesTable} en MySQL. Causa: ${e}.`);
            }
        }
        if(!usersTableExists) {
            try {
                await performQueryMySQL(`
                    CREATE TABLE ${usersTable} (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT
                    );
                `);
                console.log(`Tabla ${usersTable} creada en MySQL.`);
            } catch(e) {
                throw new Error(`No se ha podido crear la tabla ${usersTable} en MySQL. Causa: ${e}.`);
            }
        }
    }
}