import * as msg from "./message-box.js";
import * as utils from "./utils.js";
import * as dni from "./id-doc.js";


export function setup() {
    utils.documentReady().then(() => {
        $("#showcase-get-credentials").on("click", () => {
            displayShowcaseCredentials();
        });
        $("#showcase-get-id-docs").on("click", () => {
            displayShowcaseIdDocs();
        });
    });
}


async function displayShowcaseCredentials() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo credenciales de muestra...");
    try {
        let fetchRequest = await fetch("showcase/credentials");
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            $("#modal-showcase-credentials").modal("show");
            await prepareModalContents("#modal-showcase-credentials-item-template", "#modal-showcase-credentials-container", data.data,
                e => {
                    $("#modal-showcase-credentials").modal("hide");
                    $("#form-login-user").val(e.attr("username")!);
                    $("#form-login-password").val(e.attr("password")!);
                });
        } else {
            throw Error("Consulte la consola del servidor.");
        }
    } catch(e) {
        console.error(`No se ha podido obtener las credenciales del servidor. Causa: ${e}`);
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("No se ha podido obtener las credenciales del servidor.", 'error');
    }
}


async function displayShowcaseIdDocs() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo habitantes ficticios...");
    try {
        let fetchRequest = await fetch("showcase/all-ids");
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            $("#modal-showcase-id-docs").modal("show");
            let idDocs = (data.data as {DOC_IDENTIFICADOR :string}[])
                .map(n => dni.processIdDocument(n.DOC_IDENTIFICADOR, true))
                .map(i => i.display)
                .filter(utils.ensureNotNull)
                .map(i => ({DOCUMENT: i}));
            await prepareModalContents("#modal-showcase-id-docs-item-template", "#modal-showcase-id-docs-container", idDocs,
                e => {
                    $("#modal-showcase-id-docs").modal("hide");
                    $("#inhabitant-id-field").val(e.attr("document")!);
                });
        } else {
            throw Error("Consulte la consola del servidor.");
        }
    } catch(e) {
        console.error(`No se ha podido obtener los habitantes de muestra. Causa: ${e}`);
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("No se ha podido obtener los habitantes de muestra.", 'error');
    }
}



let preparationDone = false;

async function prepareModalContents(templateSelector :string, containerSelector :string, entries :{[key :string] :string}[], shortcutButton? :(elem :JQuery<HTMLElement>) => void) {
    if(preparationDone) {
        return;
    }
    let template = $(templateSelector);
    let container = $(containerSelector);
    container.children(`:not(${templateSelector})`).remove();
    
    for(let entry of entries) {
        let row = template.clone();
        row.removeAttr("id");
        for(let attribute of Object.entries(entry)) {
            row.attr(attribute[0], attribute[1]);
        }
        let rowHtml = row.html();
        
        // Busca todos los {{placeholders}} y reemplázalos por el valor del campo con el mismo nombre en los datos recibidos.
        let matches = rowHtml.matchAll(/{{(\w*)}}/gi);
        let fields = Object.keys(entry);

        for(let match of matches) {
            if(fields.indexOf(match[1]) != -1) {
                rowHtml = rowHtml.replace(match[0], entry[match[1]] == null ? '—' : entry[match[1]]);
            }
        }
        
        row.html(rowHtml);

        if(shortcutButton != null) {
            row.find("button").on("click", function() {
                shortcutButton($(this).parent());
            });
        }

        container.append(row);
        row.show();
    }
    
    template.remove();
    preparationDone = true;
}