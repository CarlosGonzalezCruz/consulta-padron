import fs from "fs";
import https from "https";
import express from "express";
import * as db from "./db-queries.js";
import * as properties from "./properties.js";
import * as login from "./login.js";


const APP = express();

export async function listen() {
    let httpsPort = properties.get<number>("Application.https-port");
    let httpPort = properties.get<number | null>("Application.http-port", null);
    https.createServer({
        key: fs.readFileSync(properties.get<string>("Application.ssl-key")),
        cert: fs.readFileSync(properties.get<string>("Application.ssl-cert"))
    }, APP).listen(httpsPort, () => {
        console.log(`(https) Atendiendo al puerto ${httpsPort}...`);
        if(httpPort != null) {
            setupHttpToHttpsRedirect(httpPort, httpsPort);
        }
    });

    login.setup(APP);
}

process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});

function setupHttpToHttpsRedirect(httpPort :number, httpsPort :number) {
    let httpApp = express();
    let targetHost = (req :any) => req.headers.host.replace(/(\w*):(\d{1,5})/, `$1:${httpsPort}`);
    httpApp.get("*", (req, res) => res.redirect(`https://${targetHost(req)}${req.url}`));
    httpApp.listen(httpPort);
    console.log(`(http) Atendiendo al puerto ${httpPort}...`);
}
  

APP.use(express.static("web"));
APP.use(express.static("out/front"));
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

APP.get('/', (request, result) => {
    result.sendFile("query.html", {root: "web"});
});

APP.post("/login", (request, result, next) => {
    login.tryLogin(request, result, next);
});

APP.post("/logout", (request, result, next) => {
    request.logout((error) => {
        if(error) {
            return next(error);
        }
        result.redirect("/");
    });
});

APP.post("/inhabitant-data-id", async (request, result) => {
    await db.openOracleDB();
    result.json(await db.getInhabitantByNationalId(request.body.id));
});