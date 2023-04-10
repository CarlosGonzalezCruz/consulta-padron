import express from "express";


const APP = express();


export async function listen(port :number) {
    APP.listen(port, () => {
        console.log(`Atendiendo al puerto ${port}...`);
    });
}

process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});

APP.use(express.static("web"));
APP.use(express.static("out/front"));
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

APP.get('/', (request, result) => {
    result.sendFile("index.html");
});