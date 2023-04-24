import fs from "fs";
import path from "path";
import { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import * as properties from "./properties.js";


const SESSION_DB_PATH = "db";

export function setup(app :Express) {
        
    const TEST_USER = {
        username: properties.get("Test.username"),
        displayname: properties.getOrElse("Test.displayname", "Test.username")
    };

    fs.mkdirSync(SESSION_DB_PATH, {recursive: true});

    app.use(session({
        secret: properties.get<string>("Test.secret"),
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
            // Provisional until proper LDAP Authentication is implemented
            if(username == properties.get("Test.username") && password == properties.get("Test.password")) {
                done(null, TEST_USER);
            } else {
                done("Authentication failed", false);
            }
        })
    );

    // Required by Passport
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user :Express.User, done) => done(null, user));
}


export function tryLogin(request :any, response :any, next :(err? :any) => void) {
    passport.authenticate("local", (error :Error, user :Express.User) => {
        if(error) {
            return next(error);
        }
        if(!user) {
            return response.send({success: false, message: "Authentication failed"});
        } else {
            console.log(`Sesión de ${(user as any).displayname} (${(user as any).username}) iniciada`);
            return response.send(user);
        }
    })(request, response, next);
}