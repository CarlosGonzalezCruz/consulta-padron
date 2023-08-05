import * as utils from "./utils.js";
import * as msg from "./message-box.js";
import * as session from "./session.js";
import * as showcase from "./display-showcase-data.js";


// Este módulo gestiona la operación de inicio de sesión desde el cliente.


utils.documentReady().then(() => {
    $("#form-login").on("submit", async function(e) {
        e.preventDefault();
        let formData = new FormData($(this).get(0) as HTMLFormElement);
        let entries = {
            "User": formData.get("User"),
            "Password": formData.get("Password")
        };
        doLogin(entries);
    });

    $("#form-login-user").on("keypress", e => {
        if(e.key == "Enter") {
            e.preventDefault();
            $("#form-login-password").trigger("focus");
        }
    });


    updateEnvironmentLabel();

    msg.preloadMsgBoxIcons();
    utils.addModalButtonKeybinding();
    showcase.setup();
});


/** Lanza una solicitud de inicio de sesión con las credenciales indicadas. */
async function doLogin(entries :{User :FormDataEntryValue | null, Password :FormDataEntryValue | null}) {
    if(!$("#form-login-user").val() || !$("#form-login-password").val()) {
        msg.displayMessageBox("No deje vacíos los campos de inicio de sesión.", 'error');
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Iniciando sesión...");

    try {
        let fetchRequest = await fetch("/login", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(entries)
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);

        if(data.success) {
            // El servidor ha aceptado las credenciales y nos ha devuelto un token que representa la sesión. Para interactuar
            // con el servidor a partir de ahora, utilizaremos dicho token.
            session.start({username: data.user.username, token: data.user.token});
            window.location.href = "/query";
        } else if(data.message == "Invalid Credentials") {
            $("#form-login .login-error").removeClass("d-none");
            utils.playCssAnimationOnce($("#form-login .login-error"), "fade-in");
        } else {
            msg.displayMessageBox(data.message, 'error');
        }

    } catch(e) {
        console.error(`No se ha podido intentar iniciar sesión. Causa: ${e}`);
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha habido un problema con el servidor al intentar iniciar sesión.", 'error');
    }
}


/** Muestra en pantalla el nombre del entorno según lo indica el servidor. */
async function updateEnvironmentLabel() {
    let fetchRequest = await fetch("/environment-label");
    let data = await fetchRequest.text();
    $("#environment-label").text(data);
}