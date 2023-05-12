import * as query from "./query-data.js";


query.enableSearch();
focusSearchBar();

function focusSearchBar() {
    $("#inhabitant-id-field").get(0)?.focus();
    $("#inhabitant-id-field").trigger("select");
}