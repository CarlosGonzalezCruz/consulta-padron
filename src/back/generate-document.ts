import PDF from "pdfkit-table";
import * as inhabitant from "./inhabitant-data.js";


// Este módulo genera documentos con datos de un habitante para que el usuario pueda descargarlo.

/** Genera un PDF con los datos del habitante solicitado. `allowedKeys` indica los campos que se incluirán, y `displayId` muestra el número identificador
 *  de manera legible para un humano en lugar de usar el documento identificador que figura la base de datos.
*/
export async function generateDocumentForInhabitant(idDoc :string, allowedKeys :string[], displayId? :string) {
    return new Promise<Buffer>(async (resolve, reject) => {
        console.log(`Generado documento para habitante con identificador ${idDoc}...`);
        let document = new PDF({
            margin: 20
        });

        // Necesario para generar los datos del PDF.
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


/** Escribe el contenido del PDF para el habitante indicado. */
async function generateDocumentContent(idDoc :string, allowedKeys :string[], document :PDF, displayId? :string) {
    let data = await inhabitant.generateEntriesFor(idDoc, allowedKeys);

    if(!data.success) { // Si ni siquiera tenemos datos sobre el habitante...
        throw new Error(`No se ha podido generar el documento para el habitante con ID ${displayId}`);
    }

    // El número identificador lo usamos como supertítulo. Si podemos usar el displayId (legible por humanos) se usa, si no, con el
    // idDoc (como en la base de datos) vale.
    document.font("Helvetica").fontSize(10)
        .text(!!displayId ? `Habitante con ${displayIdType(displayId)} ${displayId}` : `Habitante con identificador ${idDoc}`, {align: "center"});
    
    // Usamos el nombre completo como título, pero solo si tenemos permiso para obtenerlo.
    if(!!data.fullName.value) {
        document.moveDown().fontSize(16)
        .text(data.fullName.displayValue, {align: "center"});
    }

    // Como esta tabla es una lista, realmente no queremos mostrar los encabezados. Sin embargo, podemos configurarlos para modificar las
    // columnas. Se han insertado dos columnas de más, de anchura 20 y sin contenido, para mejorar la legibilidad de los datos.
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

    document.moveDown().font("Helvetica").fontSize(8)
        .text("Este documento se ha generado con propósitos de demostración y no refleja los datos de un habitante real.", {align: "center"});
    document.moveDown().image("web/assets/ayto-logo.png", {fit: [560, 50], align: "center"});
    
}


/** Indica si el id, incluyendo letras de validación etc, corresponde a un DNI, NIE o pasaporte. */
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