import * as utils from "./utils.js";
import * as msg from "./message-box.js";
import * as session from "./session.js";


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

    msg.preloadMsgBoxIcons();
    utils.addModalButtonKeybinding();
});


async function doLogin(entries :{User :FormDataEntryValue | null, Password :FormDataEntryValue | null}) {
    if(!$("#form-login-user").val() || !$("#form-login-password").val()) {
        msg.displayMessageBox("No deje vacíos los campos de inicio de sesión", 'error');
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
            session.start({username: data.user.username, token: data.user.token});
            window.location.href = "/query";
        } else {
            $("#form-login .login-error").removeClass("d-none");
            utils.playCssAnimationOnce($("#form-login .login-error"), "fade-in");
        }

    } catch(e) {
        console.error(`No se ha podido intentar iniciar sesión. Causa: ${e}`);
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha habido un problema con el servidor al intentar iniciar sesión.", 'error');
    }
}


function updateLoginButton() {
    if(!!$("#form-login-user").val() && !!$("#form-login-password").val()) {
        $("#form-login-submit").removeClass("disabled");
    } else {
        $("#form-login-submit").addClass("disabled");
    }
}