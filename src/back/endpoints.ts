import fs from "fs";
import https from "https";
import express from "express";
import passport from "passport";
import LdapStrategy from "passport-ldapauth";


const APP = express();

export async function listen(port :number) {
    https.createServer({
        key: fs.readFileSync("ssl/key.pem"),
        cert: fs.readFileSync("ssl/cert.pem")
    }, APP).listen(port, () => {
        console.log(`Atendiendo al puerto ${port}...`);
    });
}

process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});


// DOESN'T WORK for now
passport.use(new LdapStrategy({
    usernameField: "User",
    passwordField: "Password",
    server: {
        url: "ldap://ayto-alcaladehenares.es",
        searchBase: "DC=cconsistorial,DC=alcala",
        searchFilter: "(UID={{User}})"
    }
}, (user :any, done :any) => done(null, user)));

APP.use(express.static("web"));
APP.use(express.static("out/front"));
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

APP.get('/', (request, result) => {
    result.sendFile("login.html", {root: "web"});
});

APP.post('/login', (request, result) => {
    passport.authenticate("ldapauth", (err :string, user :any, info :string) => {
        if(err || info) {
            console.error(err || info);
        }
        if(!user) {
            console.error("Usuario no encontrado");
        }
        result.json({a: "a"});
    })(request, result);
});