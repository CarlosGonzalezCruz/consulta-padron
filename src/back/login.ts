import fs from "fs";
import passport from "passport";
import ldap from "ldapjs";
import { Express } from "express";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import jwt from "jsonwebtoken";
import * as properties from "./properties.js";
import * as utils from "./utils.js";


const SESSION_DB_PATH = "db";

let ldapClient :ldap.Client;
let ldapDomain :string;
let ldapUsernameMatch :RegExp;
let ldapSecret :string;
let ldapTimeout :string;

export function setup(app :Express) {
    
    ldapSecret = properties.get("LDAP.secret");
    
    initOrResetLdapClient();
    
    ldapDomain = `@${properties.get("LDAP.domain")}`;
    ldapUsernameMatch = new RegExp(`^(\w{1,})(${properties.get<string>("LDAP.domain").replace(/[#-}]/g, '\\$&')})$`);
    
    ldapTimeout = `${properties.get<number>("LDAP.timeout-s", 300)}s`;

    ldapClient.on("error", e => {
        if(e.code == "ECONNRESET") {
            initOrResetLdapClient();
        }
    });    
        
    fs.mkdirSync(SESSION_DB_PATH, {recursive: true});

    app.use(session({
        secret: properties.get<string>("LDAP.secret"),
        resave: true,
        saveUninitialized: false,
        // @ts-ignore - Ignore declaration mismatch between express-session's Store and connect-sqlite3's Store
        store: new (SQLiteStoreFactory(session))({ db: "sessions.db", dir: SESSION_DB_PATH })
    }));

    app.use(passport.authenticate("session"));

    passport.use(new LocalStrategy({
        usernameField: "User",
        passwordField: "Password",
        session: true,
    }, (username, password, done) => {

        if(properties.get("Admin.enabled", true)) {
            if(username == properties.get("Admin.username") && password == properties.get("Admin.password")) {
                done(null, {
                    username,
                    token: jwt.sign({username}, ldapSecret, {expiresIn: ldapTimeout})
                });
                return;
            }
        }
        if(username == properties.get("Admin.username")) {
            done(Error(`El nombre de usuario ${properties.get("Admin.username")} está reservado para el administrador.`), false);
            return;
        }
        if(username == properties.get("Test.username") && password == properties.get("Test.password")) {
            done(null, {
                username,
                token: jwt.sign({username}, ldapSecret, {expiresIn: ldapTimeout})
            });
            return;
        }

        let baseDN = username;
        if(!baseDN.endsWith(ldapDomain)) {
            baseDN = username + ldapDomain;
        } else {
            username = baseDN.replace(ldapUsernameMatch, "$1");
        }
        ldapClient.bind(baseDN, password, error => {
            if(error) {
                console.error(`La autenticación ha fallado. Causa: ${error}`);
                done(error, false);
            } else {
                done(null, {
                    username,
                    token: jwt.sign({username}, ldapSecret, {expiresIn: ldapTimeout})
                });
            }
            ldapClient.unbind();
        });
        })
    );

    // Required by Passport
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user :Express.User, done) => done(null, user));

    utils.triggerPassportReady();
}


function initOrResetLdapClient() {
    if(!!ldapClient) {
        ldapClient.destroy();
    }
    ldapClient = ldapClient = ldap.createClient({
        url: properties.get<string>("LDAP.address"),
        reconnect: true
    });
}


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


export function getSessionData(request :Express.Request) {
    if(!request.user) {
        request.logout(e => {});
        return {success: false, expired: false};
    } else {
        let token = (request.user as any).token;
        try {
            let ret :{success :true, data :any} = {success: true, data: jwt.verify(token, ldapSecret)};
            return ret;
        } catch(e) {
            if(e instanceof jwt.TokenExpiredError) {
                request.logout(e => {});
                return {success: false, expired: true};
            } else {
                request.logout(e => {});
                return {success: false, expired: false};
            }
        }
    }
}