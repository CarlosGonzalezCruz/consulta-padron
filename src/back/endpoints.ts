import fs from "fs";
import https from "https";
import express from "express";
import * as inhabitant from "./inhabitant-data.js"
import * as properties from "./properties.js";
import * as login from "./login.js";
import * as utils from "./utils.js";


const APP = express();

export async function listen() {
    login.setup(APP);
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

endpoint('/', "GET", (request, result) => {
    result.redirect("/login");
});

endpoint('/login', "GET", (request, result) => {
    result.sendFile("login.html", {root: "web"});
});

endpoint('/query', "GET", (request, result) => {
    result.sendFile("query.html", {root: "web"});
});

endpoint("/login", "POST", (request, result) => {
    login.tryLogin(request, result);
});

endpoint("/logout", "POST", (request, result) => {
    login.logout(request, result);
});

endpoint("/inhabitant-data-id", "POST", async (request, result) => {
    result.json(await inhabitant.generateEntriesFor(request.body.id));
});


async function endpoint(uri :string, rest :"GET" | "POST", callback :(request :any, result :any) => any) {
    await utils.passportReady();
    switch(rest) {
        case "GET":
            APP.get(uri, callback);
            break;
        case "POST":
            APP.post(uri, callback);
    }
}