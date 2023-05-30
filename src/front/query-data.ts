import * as utils from "./utils.js";
import * as msg from "./message-box.js";
import * as dni from "./id-doc.js";
import * as session from "./session.js";


let lastResult :any;


export async function enableSearch() {
    await utils.documentReady();

    $("#inhabitant-id-field").on("keypress", e => {
        if(e.key == "Enter" && !$(".modal").is(":visible")) {
            e.preventDefault();
            queryAndPopulatePage($("#inhabitant-id-field").val() as string);
        }
    });
    $("#btn-search").on("click", () => {
        queryAndPopulatePage($("#inhabitant-id-field").val() as string);
    });
    window.addEventListener("popstate", e => {
        $("#inhabitant-id-field").val(e.state?.id ?? "");
        if(!!e.state?.id) {
            queryAndPopulatePage(e.state.id, false);
        } else {
            $("#inhabitant-id-field").val("");
            makeTableVisible(false, true);
        }
    });
}


export async function enableTabs() {
    await utils.documentReady();

    $("#inhabitant-tabs li").on("click", function() {
        updateTableAndTabs($(this));
    });
}


export async function enableSessionLinks() {
    await utils.documentReady();

    $("#session-logout").on("click", () => {
        doLogout();
    });
}


async function doLogout() {
    if(!session.exists()) {
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Cerrando sesión...");

    try {
        let fetchRequest = await fetch("/logout", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            credentials: "include"
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            session.end();
            window.location.href = "/login";
        } else {
            msg.displayMessageBox("Ha ocurrido un problema al cerrar sesión", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        console.error(`Ha ocurrido un problema al cerrar sesión. Causa: ${e}`);
        msg.displayMessageBox("Ha ocurrido un problema al cerrar sesión", 'error');
    }
}


async function queryAndPopulatePage(idDoc :string, saveHistory = true) {
    let processedId = dni.processIdDocument(idDoc);
    if(!processedId.valid) {
        if(processedId.error) {
            msg.displayMessageBox(`Ha ocurrido un error inesperado al procesar el siguiente DNI ó NIE: ${idDoc}`, "error")
        } else {
            if(!!processedId.display) {
                msg.displayMessageBox(`El siguiente DNI ó NIE no es válido: ${processedId.display}` +
                (processedId.expectedControl != processedId.control ? `. Se esperaba el carácter de control '${processedId.expectedControl}'` : ""), "error");
            } else {
                msg.displayMessageBox(`El DNI ó NIE introducido no es válido.`, "error");
            }
        }
        return;
    }

    let loadingHandler = msg.displayLoadingBox(`Buscando habitante con ID ${processedId.display}...`);
    
    try {
        let result = await fetchInhabitantDataByNationalId(processedId.queryDigits);
        $("#inhabitant-id-field").val(processedId.display);
        if(saveHistory) {
            history.pushState({id: processedId.display}, '');
        }
        if(!result) {
            await utils.concludeAndWait(loadingHandler);
            $("#not-found-placeholder-id-number").text(processedId.display);
            $("#inhabitant-tabs li").removeClass("active");
            makeTableVisible(false);
        } else {
            await utils.concludeAndWait(loadingHandler);
            lastResult = result;
            console.log(result);
            $("#inhabitant-name").text(lastResult.fullName);
            updateTableAndTabs($("#inhabitant-tabs li[tab-content='overview']"));
            makeTableVisible(true);
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al conectar con el servidor", "error");
        throw Error(`Ha ocurrido un problema al conectar con el servidor. Causa: ${e}`);
    }
}


async function fetchInhabitantDataByNationalId(id :string) {
    let fetchInit = {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            id: id
        })
    }
    let fetchResult = await fetch("/inhabitant-data-id", fetchInit);
    let data = await fetchResult.json();
    return data;
}


function updateTableAndTabs(clickedTab :JQuery) {
    $("#inhabitant-tabs li").removeClass("active");
    clickedTab.addClass("active");

    let entries = [];
    switch(clickedTab.attr("tab-content")) {
        case "overview":
            entries = lastResult.entries.filter((e :any) => e.value != null);
            break;
        case "complete":
            entries = lastResult.entries;
            break;
        default:
            throw Error("Pestaña inválida");
    }
    populateTable(entries);
}


function populateTable(entries :any[]) {
    const TABLE = $("#inhabitant-data-table");
    TABLE.empty();
    for(let entry of entries) {
        let row = $("<tr>");
        row.append(`<td>${entry.displayKey}</td>`);
        row.append(`<td>${entry.displayValue}</td>`);
        TABLE.append(row);
    }
}


function makeTableVisible(visible :boolean, displayDefault :boolean = false) {
    utils.playCssAnimationOnce($("#inhabitant-data-container"), "fade-in");

    if(visible) {
        $("#inhabitant-data-container .placeholder").addClass("d-none");
        $("#inhabitant-data-container .placeholder").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-flex");
        $("#inhabitant-data").removeClass("d-none");
        $("#inhabitant-tabs li").removeClass("disabled");
    } else if(displayDefault) {
        $("#inhabitant-data-container .placeholder").addClass("d-none");
        $("#inhabitant-data-container .placeholder").removeClass("d-flex");
        $("#default-placeholder").addClass("d-flex");
        $("#inhabitant-data").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-none");
        $("#inhabitant-tabs li").addClass("disabled");
    } else {
        $("#inhabitant-data-container .placeholder").addClass("d-none");
        $("#inhabitant-data-container .placeholder").removeClass("d-flex");
        $("#not-found-placeholder").addClass("d-flex");
        $("#inhabitant-data").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-none");
        $("#inhabitant-tabs li").addClass("disabled");
    }
}