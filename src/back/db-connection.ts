import fs from "fs";
import sqlite3 from "sqlite3";
import * as properties from "./properties.js";


// Este módulo administra conexiones y consultas contra bases de datos. Antes de conectar a una base de datos es necesario usar el método "open" que corresponda.

const DB_PATHS = {
    oracledb: "db/oracle.db",
    mysql: "db/mysql.db"
} as const;

let oracledb :sqlite3.Database | null;
let oracledbCloseTimeout :NodeJS.Timeout | null; // Referencia al objecto timeout para cerrar la conexión. Se puede resetear el timeout.
let mysqldb :sqlite3.Database;

let mysqldbLastRowCount = 0; // Cantidad de filas alteradas por la última consulta de MySQL.
                            // No siempre queremos actualizar este número, ya que algunas consultas (p.ej un SELECT simple) siempre indicará que se han actualizado 0 filas.


/** Abre una connection pool para MySQL, y crea las tablas requeridas si no existen. La connection pool cerrará las conexiones en desuso automáticamente. */
export async function openMySQL() {
    ensureDirectoryExists(DB_PATHS.mysql);
    await establishMySQLConnection();
    await initTables();
}


/** Garantiza que exista una conexión a OracleDB, si es posible. O bien se abre una conexión nueva, o bien se extiende el tiempo
 *  de vida de una conexión que ya exista. La conexión se cerrará en cuanto se complete el timeout.
 */
export async function openOracleDB() {
    let success :boolean;
    ensureDirectoryExists(DB_PATHS.oracledb);
    try {
        if(!!oracledb) {
            resetCloseTimeout(closeOracleDB);
        }
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


/** Cierra inmediatamente la conexión a OracleDB. */
export async function closeOracleDB() {
    if(!oracledb) {
        // ¿No tenemos conexión? No hay nada que hacer.
        return;
    }
    oracledb.close();
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
        // En la versión de muestra, no hacer nada.
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
        mysqldb.all(query, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                mysqldb.get(`SELECT SQLITE3_TOTAL_CHANGES() AS changes`, (err, row :any) => {
                    if(updateMetaResults) {
                        if (err) {
                            reject(err);
                        } else {
                            mysqldbLastRowCount = row.changes;
                            resolve(rows);
                        }
                    } else {
                        resolve(rows);
                    }
                });
            }
        });
    });
}


/** Realiza una consulta contra OracleDB. En principio, este programa no cuenta con permisos para insertar, alterar o borrar datos en OracleDB. */
export async function performQueryOracleDB(query :string) :Promise<{[k :string] :any}[]> {
    if(!oracledb) {
        await openOracleDB();
    }
    if(!!oracledbCloseTimeout) {
        clearTimeout(oracledbCloseTimeout);
        oracledbCloseTimeout = setTimeout(closeOracleDB, properties.get("Oracle.timeout-ms", 0));
    }
    return new Promise(resolve => {
        oracledb!.all(query, (_, rows) => {
            resolve(rows as {[k :string] :any}[]);
        });
    });
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
    return new Promise((resolve, reject) => {
        oracledb = new sqlite3.Database(DB_PATHS.oracledb, err => {
            if(err) {
                reject(err);
            } else {
                resolve(oracledb);
            }
        });
    });
}


/** Crea la connection pool a MySQL y lanza una consulta de prueba para verificar que funciona. Este método debe ejecutarse
 *  antes de realizar cualquier consulta contra MySQL. El módulo de MySQL se encargará de cerrar las conexiones cuando dejemos de usarlas.
 */
async function establishMySQLConnection() {
    return new Promise((resolve, reject) => {
        mysqldb = new sqlite3.Database(DB_PATHS.mysql, err => {
            if(err) {
                reject(err);
            } else {
                resolve(mysqldb);
            }
        });
    });
}


function ensureDirectoryExists(path: string) {
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
}


/** Comprueba que existen en MySQL las tablas que requiere este programa, y las crea en caso negativo. */
async function initTables() {
    let rolesTable = profileTable("ROLES", false);
    let usersTable = profileTable("USERS", false);
    // Estas consultas devolverán el número de tablas "ROLES" y "USERS" que existan (debería ser 0 ó 1).
    let rolesTableExists = (await performQueryMySQL(`SELECT name FROM sqlite_master WHERE type='table' AND name='${rolesTable}'`)).length != 0;
    let usersTableExists = (await performQueryMySQL(`SELECT name FROM sqlite_master WHERE type='table' AND name='${usersTable}'`)).length != 0;

    if(!rolesTableExists || !usersTableExists) {
        console.log(`Se van a crear las tablas necesarias en MySQL.`);
        if(!rolesTableExists) {
            // No tenemos tabla de roles, hay que crearla.
            try {
                await performQueryMySQL(`
                    CREATE TABLE ${rolesTable} (
                        id INTEGER PRIMARY KEY,
                        name TEXT,
                        isDefault VARCHAR(1) NOT NULL DEFAULT 'F',
                        isAdmin VARCHAR(1) NOT NULL DEFAULT 'F',
                        parent INTEGER,
                        entries JSON,
                        CHECK(isDefault IN ('T', 'F')),
                        CHECK(isAdmin IN ('T', 'F')),
                        FOREIGN KEY(parent) REFERENCES ${rolesTable}(id)
                    );
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
                    CREATE TABLE ${usersTable} (
                        id INTEGER PRIMARY KEY,
                        username VARCHAR(30) UNIQUE,
                        role INTEGER,
                        isAuxiliar VARCHAR(1) NOT NULL DEFAULT 'F',
                        CHECK(isAuxiliar IN ('T', 'F')),
                        FOREIGN KEY(role)
                            REFERENCES ${rolesTable}(id)
                    );
                `);
                console.log(`Tabla ${usersTable} creada en MySQL.`);
            } catch(e) {
                throw new Error(`No se ha podido crear la tabla ${usersTable} en MySQL. Causa: ${e}.`);
            }
        }
    }

    openOracleDB();

    oracledb!.exec(`
        CREATE TABLE IF NOT EXISTS PMH_SIT_HABITANTE (
            ID INTEGER PRIMARY KEY,
            HABITANTE_ID INTEGER,
            INSCRIPCION_ID INTEGER,
            MOVIMIENTO_ID INTEGER,
            VIVIENDA_ID INTEGER,
            ES_ULTIMO TEXT,
            ES_VIGENTE TEXT,
            FOREIGN KEY (HABITANTE_ID) REFERENCES PMH_HABITANTE(DBOID),
            FOREIGN KEY (INSCRIPCION_ID) REFERENCES PMH_INSCRIPCION(DBOID),
            FOREIGN KEY (MOVIMIENTO_ID) REFERENCES PMH_MOVIMIENTO(DBOID),
            FOREIGN KEY (VIVIENDA_ID) REFERENCES PMH_VIVIENDA(DBOID)
        );

        CREATE TABLE IF NOT EXISTS PMH_NIV_INSTRUCCION_T (
            COD_NIVEL_INSTRUCCION TEXT PRIMARY KEY,
            DESCRIPCION TEXT,
            VALIDADO INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS PMH_HABITANTE (
            DBOID INTEGER PRIMARY KEY,
            DOC_IDENTIFICADOR TEXT,
            NOMBRE_COMPLETO TEXT,
            ALTA_MUNI_FECHA TEXT,
            NACIM_FECHA TEXT,
            SEXO_INE INTEGER,
            TELEFONO TEXT,
            TELEFONO_MOVIL TEXT,
            FAX TEXT,
            EMAIL TEXT,
            COD_NIVEL_INSTRUCCION TEXT,
            NOMBRE_PADRE TEXT,
            NOMBRE_MADRE TEXT,
            ES_PROTEGIDO TEXT,
            ES_PARALIZADO TEXT,
            NOMBRE_FONETICO TEXT,
            NOMBRE_LATIN TEXT,
            APELLIDO1_LATIN TEXT,
            APELLIDO2_LATIN TEXT,
            FOREIGN KEY (COD_NIVEL_INSTRUCCION) REFERENCES PMH_NIV_INSTRUCCION_T(COD_NIVEL_INSTRUCCION)
        );
        
        CREATE TABLE IF NOT EXISTS PMH_INSCRIPCION (
            DBOID INTEGER PRIMARY KEY
        );
        
        CREATE TABLE IF NOT EXISTS PMH_MOVIMIENTO (
            DBOID INTEGER PRIMARY KEY,
            TIPO_MOVIMIENTO_ID INTEGER,
            FECHA_OCURRENCIA TEXT
        );
        
        CREATE TABLE IF NOT EXISTS CNF_MOVIMIENTO_PMH (
            DBOID INTEGER PRIMARY KEY,
            DESCRIPCION TEXT
        );
        
        CREATE TABLE IF NOT EXISTS PMH_VIVIENDA (
            DBOID INTEGER PRIMARY KEY,
            ADDRESS TEXT,
            CODIGO_POSTAL TEXT,
            NUCLEO_DISEMINADO_NOMBRE TEXT
        );

        INSERT OR IGNORE INTO CNF_MOVIMIENTO_PMH (DBOID, DESCRIPCION) VALUES
            (1, 'Modificación tipo documento'),
            (2, 'Baja por no confirmación'),
            (3, 'Baja duplicidad'),
            (4, 'Baja Cambio Residencia'),
            (5, 'Modificacion Datos Personales'),
            (6, 'Alta omision'),
            (7, 'Alta nacimiento'),
            (8, 'Cambio Domicilio'),
            (9, 'Alta cambio residencia'),
            (10, 'Baja Inscripcion Indebida'),
            (11, 'Baja defuncion'),
            (12, 'Renovación Residencia'),
            (13, 'Creacion padron'),
            (14, 'Variación territorial'),
            (15, 'Cambio Inscripción'),
            (16, 'Cambio Inscripción de Vivienda'),
            (17, 'Unificación Inscripción'),
            (18, 'Baja Caducidad (ENCSARP)'),
            (19, 'Confirmación residencia'),
            (20, 'Baja de oficio'),
            (21, 'Baja Inclusion sin INE'),
            (22, 'Modif.dato domicilio'),
            (23, 'Corr.datos sin ef.INE'),
            (24, 'Modificación Seccionado'),
            (25, 'Modificación de Hoja'),
            (26, 'Modificación cód. ind.');

        INSERT OR IGNORE INTO PMH_NIV_INSTRUCCION_T (COD_NIVEL_INSTRUCCION, DESCRIPCION, VALIDADO) VALUES
            ('00', '00.- No aplicable menor de 16 años', 1),
            ('10', '10.- No sabe leer ni escribir', 1),
            ('11', '11.- No sabe leer ni escribir', 1),
            ('20', '20.- Titulación inferior a graduado escolar', 1),
            ('21', '21.- Sin estudios', 1),
            ('22', '22.- Primaria o EGB incompleta, Cert. Escolaridad', 1),
            ('30', '30.- Graduado escolar o equivalente', 1),
            ('31', '31.- Bachiller, Graduado Escolar, EGB, Primaria, ESO.', 1),
            ('32', '32.- FP 1, FP de Grado Medio. Oficialía Industrial - Ciclo medio', 1),
            ('40', '40.- Bachiller, FP2, equivalente o superiores, Ciclos superiores', 1),
            ('41', '41.- Formación Profesional Segundo Grado. Formación profesional de Grado Superior. Maestría industrial', 1),
            ('42', '42.- Bachiller superior. BUP. Bachiller LOGSE', 1),
            ('43', '43.- Otras titulaciones medias (Aux. Clínica, Prog. informático, Auxiliar de vuelo, Diplomados Artes)', 1),
            ('44', '44.- Diplomados Universitarios (Empresariales, Profesorado, ATS, etc.)', 1),
            ('45', '45.- Arquitecto. Ingeniero Técnico', 1),
            ('46', '46.- Licenciado Universitario. Arquitecto. Ing. Superior', 1),
            ('47', '47.- Titulados de Estudios Superiores no universitarios', 1),
            ('48', '48.- Doctorado y Estudios de postgrados', 1),
            ('99', '99.- Desconocido', 1);
    `);
}