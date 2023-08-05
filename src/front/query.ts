import * as query from "./query-data.js";
import * as msg from "./message-box.js";
import * as session from "./session.js";
import * as utils from "./utils.js";
import * as showcase from "./display-showcase-data.js";

// Este módulo es el índice de la pantalla de consulta de habitantes.


query.enableSearch();
query.enableTabs();
query.enableSessionLinks();

msg.preloadMsgBoxIcons();
utils.addModalButtonKeybinding();
utils.setCursorLoadingState(false);

utils.documentReady().then(() => {
    checkSession();
    focusSearchBar();
    updateEnvironmentLabel();
    showcase.setup();
});

function checkSession() {
    if(session.exists()) {
        $("#session-username").text(session.getUsername()!);
    } else {
        // Si no hay sesión, redirigimos automáticamente a la pantalla de inicio de sesión.
        window.location.href = "/login";
    }
}

function focusSearchBar() {
    $("#inhabitant-id-field").get(0)?.focus();
    $("#inhabitant-id-field").trigger("select");
}

async function updateEnvironmentLabel() {
    let fetchRequest = await fetch("/environment-label");
    let data = await fetchRequest.text();
    $("#environment-label").text(data);
}