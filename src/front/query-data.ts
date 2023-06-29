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
            makeTableVisible(false, $("#default-placeholder"));
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

    if(await isCurrentUserAdmin()) {
        $("#admin-link").removeClass("d-none");
        $("#admin-link").on("click", () => {
            window.location.href = "/admin";
        });
    }
    $("#session-logout").on("click", () => {
        doLogout();
    });
}


export async function doLogout() {
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
            msg.displayMessageBox("Ha ocurrido un problema al cerrar sesión.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        console.error(`Ha ocurrido un problema al cerrar sesión. Causa: ${e}`);
        window.location.href = "/login";
    }
}


async function queryAndPopulatePage(idDoc :string, saveHistory = true) {
    let processedId = dni.processIdDocument(idDoc, $("#dni-nie-passport-selector").find(":selected").val() == "dni-nie");
    if(processedId.isDniNie && !processedId.valid) {
        if(processedId.error) {
            msg.displayMessageBox(`Ha ocurrido un error inesperado al procesar el siguiente DNI ó NIE: ${idDoc}.`, "error")
        } else {
            if(!!processedId.display) {
                msg.displayMessageBox(`El siguiente DNI ó NIE no es válido: ${processedId.display}` +
                (processedId.expectedControl != processedId.control ? `. Se esperaba el carácter de control '${processedId.expectedControl}'.` : "."), "error");
            } else {
                msg.displayMessageBox(`El DNI ó NIE introducido no es válido.`, "error");
            }
        }
        return;
    }

    let loadingHandler = msg.displayLoadingBox(`Buscando habitante con ID ${processedId.display}...`);
    
    try {
        let result = await fetchInhabitantDataByNationalId(processedId.queryDigits);
        if(!result.success) {
            await utils.concludeAndWait(loadingHandler);
            if(result.expired) {
                msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                    () => window.location.href = "/login");
            } else {
                msg.displayMessageBox("La sesión actual no es válida. Por favor, inice sesión de nuevo.", 'error',
                    () => window.location.href = "/login");
            }
            return;
        }

        $("#inhabitant-id-field").val(processedId.display);
        if(saveHistory) {
            history.pushState({id: processedId.display}, '');
        }

        await utils.concludeAndWait(loadingHandler);
        if(!result.data.success) {
            $("#inhabitant-tabs li").removeClass("active");
            if(result.data.unauthorized) {
                makeTableVisible(false, $("#unauthorized-placeholder"));
            } else {
                $("#not-found-placeholder-id-number").text(processedId.display);
                makeTableVisible(false, $("#not-found-placeholder"));
            }
        } else {
            lastResult = result.data;
            displayFullName(lastResult.fullName);
            updateTableAndTabs($("#inhabitant-tabs li[tab-content='overview']"));
            makeTableVisible(true);
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al conectar con el servidor.", 'error');
        throw Error(`Ha ocurrido un problema al conectar con el servidor. Causa: ${e}`);
    }
}


function displayFullName(fullNameEntry :any) {
    if(fullNameEntry.allowed) {
        if(!!fullNameEntry.value) {
            $("#inhabitant-name").text(fullNameEntry.displayValue);
        } else {
            $("#inhabitant-name").html("<small class='missing-full-name'>No hay datos del nombre</small>");
        }
    } else {
        $("#inhabitant-name").html("<small class='missing-full-name'>Sin autorización para ver el nombre</small>");
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


async function isCurrentUserAdmin() {
    let fetchResult = await fetch("/am-i-admin", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include"
    });
    let data = await fetchResult.json();
    return !!data.admin;
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


function makeTableVisible(visible :boolean, placeholderScreen :JQuery | null = null) {
    utils.playCssAnimationOnce($("#inhabitant-data-container"), "fade-in");

    if(visible) {
        $("#inhabitant-data-container .placeholder").addClass("d-none");
        $("#inhabitant-data-container .placeholder").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-flex");
        $("#inhabitant-data").removeClass("d-none");
        $("#inhabitant-tabs li").removeClass("disabled");
    } else {
        if(placeholderScreen == null) {
            placeholderScreen = $("#not-found-placeholder");
        }
        $("#inhabitant-data-container .placeholder").addClass("d-none");
        $("#inhabitant-data-container .placeholder").removeClass("d-flex");
        placeholderScreen.addClass("d-flex");
        $("#inhabitant-data").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-none");
        $("#inhabitant-tabs li").addClass("disabled");
    }
}