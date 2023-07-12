import fs from "fs";
import passport from "passport";
import ldap from "ldapjs";
import { Express } from "express";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import jwt from "jsonwebtoken";
import * as permissions from "./permissions.js";
import * as properties from "./properties.js";
import * as utils from "./utils.js";


// Este módulo gestiona la autenticación y las credenciales de los usuarios.


const SESSION_DB_PATH = "db";

let ldapClient :ldap.Client;
let ldapDomain :string;
let ldapSecret :string;
let ldapTimeout :string;

/** Configura la autenticación de usuarios. */
export function setup(app :Express) {
    
    ldapSecret = properties.get("LDAP.secret");
    ldapDomain = `@${properties.get("LDAP.domain")}`;
    ldapTimeout = `${properties.get<number>("LDAP.timeout-s", 300)}s`;   
        
    fs.mkdirSync(SESSION_DB_PATH, {recursive: true}); // Aquí creamos el directorio para la base de datos de SQLite3 donde se almacenarán las sesiones.

    app.use(session({ // Configuración para la sesión de Express.js
        secret: properties.get<string>("LDAP.secret"),
        resave: true,
        saveUninitialized: false,
        // @ts-ignore - Ignoramos la discrepancia en la declaración de los tipos de express-session y connect-sqlite3.
        store: new (SQLiteStoreFactory(session))({ db: "sessions.db", dir: SESSION_DB_PATH })
    }));

    app.use(passport.authenticate("session"));

    passport.use(new LocalStrategy({
        usernameField: "User",
        passwordField: "Password",
        session: true,
    }, (username, password, done) => { // Esto se ejecutará una vez Passport reciba la señal de hacer login, pero antes de verificar las credenciales.
        
        // Comprobamos si el usuario se está identificando con el administrador auxiliar, si está activado.
        if(properties.get("Admin.enabled", true)) {
            if(username == properties.get("Admin.username", null)) { // Aunque esté activado, si no hay Admin.username se considera que no está activado.
                if(password == properties.get("Admin.password")) {
                    // Credenciales correctas
                    permissions.findAuxAdmin(properties.get<string>("Admin.username")).then(result => {
                        if(result.success) { // No ha habido ningún problema para logearse con el admin.
                            done(null, {
                                username,
                                token: jwt.sign({user: result.data.username, isAdmin: true}, ldapSecret, {expiresIn: ldapTimeout})
                            });
                        } else if(result.failedRename) { // Si se ha cambiado recientemente el nombre del admin y se está tratando de loguear ahora, no lo
                                                         // permitimos. Los nombres de usuario son únicos.
                            done(Error(`El nuevo nombre del administrador, "${properties.get("Admin.username")}", ya está en uso para otro usuario.`
                                + " Cámbielo para poder utilizar la cuenta auxiliar de administrador."), false);
                        } else {
                            // No se ha encontrado ningún usuario con el nombre de usuario del administrador.
                            done(Error(`Ha ocurrido un error inesperado con la cuenta auxiliar del administrador.`), false);
                        }
                    });
                } else {
                    // Contraseña de administrador incorrecta.
                    done(Error("Invalid Credentials"), false);
                }
                return; // Nada más que hacer aquí.
            }
        }
        // Si no está activado, pero seguimos teniendo un nombre de administrador auxiliar, no queremos permitir que otros usuarios puedan usarlo
        // como nombre de usuario propio.
        if(username == properties.get("Admin.username", null)) {
            done(Error(`El nombre de usuario "${properties.get("Admin.username")}" está reservado para el administrador.`), false);
            return;
        }

        let baseDN = username; // Por ejemplo, baseDN=pilgestioncpd@ayto-alcaladehenares.es, username=pilgestioncpd
        if(!baseDN.endsWith(ldapDomain)) {
            baseDN = username + ldapDomain;
        } else {
            username = baseDN.split('@')[0];
        }

        initOrResetLdapClient();

        // Intentamos validar la cuenta de LDAP con la contraseña recibida.
        ldapClient.bind(baseDN, password, error => {
            if(error) {
                // O el usuario no existe o la contraseña es incorrecta.
                console.error(`La autenticación ha fallado. Causa: ${error}`);
                done(error, false);
            } else {
                permissions.identify(username).then(user => {
                    // Credenciales correctas. Iniciamos sesión.
                    done(null, {
                        username,
                        token: jwt.sign({username: user.username, isAdmin: user.isAdmin == 'T'}, ldapSecret, {expiresIn: ldapTimeout})
                    });
                }).catch(e => {
                    // Credenciales correctas, pero el programa está configurado para no permitir cuentas nuevas a no ser que un administrador las cree,
                    // y este usuario no estaba previamente en la base de datos.
                    console.error(`El usuario ${username}, no registrado previamente, ha intentado acceder y se le ha denegado el acceso. Causa: ${e}`);
                    done(Error(`No cuenta con autorización para acceder a este aplicativo. Póngase en contacto con un administrador.`), false);
                });
            }
            // No necesitamos mantener la conexión al cliente de LDAP.
            ldapClient.unbind();
            ldapClient.destroy();
            });
        })
    );

    // Requerido por Passport.
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user :Express.User, done) => done(null, user));

    // Passport ya ha terminado de inicializar la configuración de inicio de sesión.
    utils.triggerPassportReady();
}


/** Crea un nuevo cliente de LDAP a la dirección especificada en las propiedades, y destruye el cliente anterior si lo hay. */
function initOrResetLdapClient() {
    if(!!ldapClient) {
        ldapClient.destroy();
    }
    ldapClient = ldap.createClient({
        url: properties.get<string>("LDAP.address"),
        reconnect: true
    });
}


/** Intenta loguear al usuario que ha enviado la request con sus credenciales usando Passport. No se puede usar antes de login.setup(). */
export function tryLogin(request :any, response :any) {
    passport.authenticate("local", (error :Error, user :Express.User) => {
        if(error) {
            return response.send({success: false, message: error.message});
        }
        if(!user) {

            return response.send({success: false, message: "La autenticación ha fallado"});
        } else {
            request.login(user, (error :Error) => {
                if(error) {
                    return response.send({success: false, message: "La autenticación ha fallado"});
                } else {
                    console.log(`Sesión de ${(user as any).username} iniciada`);
                    return response.send({success: true, user: user});
                }
            });
        }
    })(request, response);
}


/** Intenta cerrar la sesión del usuario que ha enviado la request. */
export function tryLogout(request :any, result :any) {
    let username = (request.user as any).username;
    request.logout((error :any) => {
        if(error) {
            console.error(`Error al cerrar la sesión de ${username}. Causa: ${error}`);
            result.send({success: false});
        } else {
            console.log(`Cerrada la sesión de ${username}`);
            result.send({success: true});
        }
    });
}


/** Verifica si la sesión del usuario que envió la request es válida, en cuyo caso también devuelve los datos almacenados en el token. Este método
 *  deberá usarse antes de realizar cualquier consulta expuesta a REST.
 */
export function getSessionData(request :Express.Request) {
    if(!request.user) {
        // La request no es de un usuario logueado.
        request.logout(e => {});
        let ret = {success: false as const, expired: false};
        return ret;
    } else {
        let token = (request.user as any).token;
        try {
            // La sesión es válida y correcta. jwt.verify lanzará un error en caso de que no lo sea.
            let ret = {success: true as const, data: (jwt.verify(token, ldapSecret) as any)};
            return ret;
        } catch(e) {
            if(e instanceof jwt.TokenExpiredError) {
                // La sesión ya no es válida porque ha expirado.
                request.logout(e => {});
                let ret = {success: false as const, expired: true};
                return ret;
            } else {
                // La sesión no es válida por algún motivo imprevisto.
                request.logout(e => {});
                let ret = {success: false as const, expired: false};
                return ret;
            }
        }
    }
}