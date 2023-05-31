import * as query from "./query-data.js";
import * as msg from "./message-box.js";
import * as session from "./session.js";
import * as utils from "./utils.js";


query.enableSearch();
query.enableTabs();
query.enableSessionLinks();

msg.preloadMsgBoxIcons();
utils.addModalButtonKeybinding();
utils.setCursorLoadingState(false);

utils.documentReady().then(() => {
    checkSession();
    focusSearchBar();
});

function checkSession() {
    if(session.exists()) {
        $("#session-username").text(session.getUsername()!);
    } else {
        window.location.href = "/login";
    }
}

function focusSearchBar() {
    $("#inhabitant-id-field").get(0)?.focus();
    $("#inhabitant-id-field").trigger("select");
}