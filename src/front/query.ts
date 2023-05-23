import * as query from "./query-data.js";
import * as msg from "./message-box.js";
import * as utils from "./utils.js";


query.enableSearch();
query.enableTabs();

msg.preloadMsgBoxIcons();
utils.addModalButtonKeybinding();

focusSearchBar();

function focusSearchBar() {
    $("#inhabitant-id-field").get(0)?.focus();
    $("#inhabitant-id-field").trigger("select");
}