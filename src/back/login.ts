import fs from "fs";
import passport from "passport";
import ldap from "ldapjs";
import { Express } from "express";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import * as properties from "./properties.js";


const SESSION_DB_PATH = "db";

let ldapClient :ldap.Client;
let ldapDomain :string;
let ldapUsernameMatch :RegExp;


export function setup(app :Express) {

    ldapClient = ldap.createClient({
        url: properties.get<string>("LDAP.address"),
        reconnect: true
    });

    ldapDomain = `@${properties.get("LDAP.domain")}`;
    ldapUsernameMatch = new RegExp(`^(\w{1,})(${properties.get<string>("LDAP.domain").replace(/[#-}]/g, '\\$&')})$`);

    ldapClient.on("connected", () => {
        console.log("LDAP connected");
    });

    ldapClient.on("connected", () => {
        console.log("LDAP connected");
    });
        
    fs.mkdirSync(SESSION_DB_PATH, {recursive: true});

    app.use(session({
        secret: properties.get<string>("LDAP.secret"),
        resave: false,
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
                    username: username
                });
            }
            ldapClient.unbind();
        });
        })
    );

    // Required by Passport
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user :Express.User, done) => done(null, user));
}


export function tryLogin(request :any, response :any) {
    passport.authenticate("local", (error :Error, user :Express.User) => {
        ldapClient.unbind();
        if(error) {
            return response.send({success: false, message: error.message});
        }
        if(!user) {
            return response.send({success: false, message: "La autenticación ha fallado"});
        } else {
            console.log(`Sesión de ${(user as any).username} iniciada`);
            return response.send({success: true, user: user});
        }
    })(request, response);
}


export function logout(request :any, result :any) {
    request.logout((error :any) => {
        if(error) {
            console.error(`Error al cerrar la sesión de ${(request.user! as any).username}. Causa: ${error}`);
            return;
        }
        console.log(`Cerrada la sesión de ${(request.user as any).username}`);
        result.redirect("/");
    });
}