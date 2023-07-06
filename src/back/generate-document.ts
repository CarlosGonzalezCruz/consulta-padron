import PDF from "pdfkit-table";
import * as inhabitant from "./inhabitant-data.js";


export async function generateDocumentForInhabitant(idDoc :string, allowedKeys :string[], displayId? :string) {
    return new Promise<Buffer>(async (resolve, reject) => {
        console.log(`Generado documento para habitante con identificador ${idDoc}...`);
        let document = new PDF({
            margin: 20
        });

        let buffers :any[] = [];
        document.on("data", buffers.push.bind(buffers));
        document.on("end", () => {
            let pdfData = Buffer.concat(buffers);
            console.log(`Documento generado.`);
            resolve(pdfData);
        });

        await generateDocumentContent(idDoc, allowedKeys, document, displayId?.trim());
        
        document.end();
    });
}


async function generateDocumentContent(idDoc :string, allowedKeys :string[], document :PDF, displayId? :string) {
    let data = await inhabitant.generateEntriesFor(idDoc, allowedKeys);

    if(!data.success) {
        throw new Error(`No se ha podido generar el documento para el habitante con ID ${displayId}`);
    }

    document.font("Helvetica").fontSize(10)
        .text(!!displayId ? `Habitante con ${displayIdType(displayId)} ${displayId}` : `Habitante con identificador ${idDoc}`, {align: "center"});
    
    if(!!data.fullName.value) {
        document.moveDown().fontSize(16)
        .text(data.fullName.displayValue, {align: "center"});
    }

    document.moveDown().table({
        headers: [
            {label: "", width: 200, columnColor: "#BEBEBE", columnOpacity: 0.1, align: "right"},
            {label: "", width: 20, columnColor: "#BEBEBE", columnOpacity: 0.1},
            {label: "", width: 20}, {label: "", width: 320}
        ],
        rows: data.entries.filter(e => !!e.value).map(e => [e.displayKey, "", "", e.displayValue])     
    },
    {
        width: 560,
        prepareRow: (_, column) => column == 0 ? document.font("Helvetica-Bold") : document.font("Helvetica")
    });

    document.moveDown().image("web/assets/ayto-logo.png", {fit: [560, 50], align: "center"});
}


function displayIdType(displayId :string) {
    const MATCH_DNI = /^\d{1,9}[A-Za-z]$/;
    const MATCH_NIE = /^[XYZxyz]\d{1,7}[A-Za-z]$/;

    if(!!MATCH_DNI.exec(displayId)) {
        return "DNI";
    } else if(!!MATCH_NIE.exec(displayId)) {
        return "NIE";
    } else {
        return "pasaporte";
    }
}