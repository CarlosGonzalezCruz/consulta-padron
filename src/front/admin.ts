import * as admin from "./admin-data.js";
import * as session from "./session.js";
import * as utils from "./utils.js";
import * as msg from "./message-box.js";

// Este módulo es el índice para la pantalla del panel de administración.


msg.preloadMsgBoxIcons();

admin.enableSessionLinks();
admin.initialize();

utils.addModalButtonKeybinding();
utils.documentReady().then(() => {
    checkSession();
    updateEnvironmentLabel();
});


function checkSession() {
    if(session.exists()) {
        $("#session-username").text(session.getUsername()!);
        fetch("/am-i-admin", {method: "POST", credentials: "include"}).then(async response => {
            let data = await response.json();
            if(!data.admin) {
                // Si entra en esta pantalla un usuario sin permisos de administrador (p.ej introduciendo la URI en su navegador), se le redirige
                // a la pantalla de inicio de sesión. De todas formas, sin un token verificado como administrador, el servidor no responderá a las
                // peticiones de esta pantalla.
                window.location.href = "/login";
            }
        });
    } else {
        // Si el usuario no ha iniciado sesión, le redirigimos a la pantalla de inicio de sesión.
        window.location.href = "/login";
    }
}


async function updateEnvironmentLabel() {
    let fetchRequest = await fetch("/environment-label");
    let data = await fetchRequest.text();
    $("#environment-label").text(data);
}