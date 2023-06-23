import * as admin from "./admin-data.js";
import * as session from "./session.js";
import * as utils from "./utils.js";
import * as msg from "./message-box.js";


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
                window.location.href = "/login";
            }
        });
    } else {
        window.location.href = "/login";
    }
}


async function updateEnvironmentLabel() {
    let fetchRequest = await fetch("/environment-label");
    let data = await fetchRequest.text();
    $("#environment-label").text(data);
}