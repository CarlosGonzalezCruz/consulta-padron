import fs from "fs";
import https from "https";
import express from "express";
import passport from "passport";
import LdapStrategy from "passport-ldapauth";


const APP = express();

export async function listen(httpsPort :number, httpPort? :number) {
    https.createServer({
        key: fs.readFileSync("ssl/key.pem"),
        cert: fs.readFileSync("ssl/cert.pem")
    }, APP).listen(httpsPort, () => {
        console.log(`(https) Atendiendo al puerto ${httpsPort}...`);
        if(httpPort != null) {
            setupHttpToHttpsRedirect(httpPort, httpsPort);
        }
    });
}

process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});

function setupHttpToHttpsRedirect(httpPort :number, httpsPort :number) {
    let httpApp = express();
    let targetHost = (req :any) => req.headers.host.replace(/(\w*):(\d{2,5})/, `$1:${httpsPort}`);
    httpApp.get("*", (req, res) => res.redirect(`https://${targetHost(req)}${req.url}`));
    httpApp.listen(httpPort);
    console.log(`(http) Atendiendo al puerto ${httpPort}...`);
}

// DOESN'T WORK for now
passport.use("ldapauth", new LdapStrategy({
        server: {
            url: "ldap://cconsistorial.alcala",
            bindDN: "OU=AYUNTAMIENTO,DC=cconsistorial,DC=alcala",
            bindProperty: "{{username}}",
            bindCredentials: "{{password}}",
            searchBase: "DC=cconsistorial,DC=alcala",
            searchFilter: "(UID={{username}})"
        },
        usernameField: "User",
        passwordField: "Password"
    },
    function(req, user, done) {
        done(null, user);
    })
);

// Required by Passport
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user :Express.User, done) => done(null, user));
  

APP.use(express.static("web"));
APP.use(express.static("out/front"));
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

APP.get('/', (request, result) => {
    result.sendFile("login.html", {root: "web"});
});

APP.post("/login", (request, result, next) => {
    let ret = passport.authenticate("ldapauth", {session: false}, (error :Error, user :Express.User) => {
        if(error) {
            return next(error);
        }
        if(!user) {
            return result.send({success: false, message: "Authentication failed"});
        } else {
            return result.send(user);
        }
    })(request, result, next);
});