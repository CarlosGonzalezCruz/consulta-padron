import * as utils from "./utils.js";
import * as msg from "./message-box.js";


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
}


async function queryAndPopulatePage(id :string) {
    let loadingHandler = msg.displayLoadingBox(`Buscando habitante con ID ${id}...`);
    let result = await fetchInhabitantDataByNationalId(id);
    if(!result) {
        await utils.concludeAndWait(loadingHandler);
        $("#not-found-placeholder-id-number").text(id);
        makeTableVisible(false);
    } else {
        await utils.concludeAndWait(loadingHandler);
        console.log(result);
        $("#inhabitant-name").text(result.fullName);
        populateTable(result.entries);
        makeTableVisible(true);
    }
}


async function fetchInhabitantDataByNationalId(id :string) {
    let fetchInit = {
        method: "post",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            id: id
        })
    }
    let fetchResult = await fetch("/inhabitant-data-id", fetchInit);
    let data = await fetchResult.json();
    return data;
}


function populateTable(entries :any[]) {
    const TABLE = $("#inhabitant-data-table");
    TABLE.empty();
    for(let entry of entries) {
        let row = $("<tr>");
        row.append(`<td>${entry.displayKey}</td>`);
        row.append(`<td>${entry.value}</td>`);
        TABLE.append(row);
    }
}


function makeTableVisible(visible :boolean) {
    if(visible) {
        $("#default-placeholder").addClass("d-none");
        $("#default-placeholder").removeClass("d-flex");
        $("#not-found-placeholder").addClass("d-none");
        $("#not-found-placeholder").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-flex");
        $("#inhabitant-data").removeClass("d-none");
        $("#inhabitant-tabs li").removeClass("disabled");
    } else {
        $("#default-placeholder").addClass("d-none");
        $("#default-placeholder").removeClass("d-flex");
        $("#not-found-placeholder").addClass("d-flex");
        $("#not-found-placeholder").removeClass("d-none");
        $("#inhabitant-data").removeClass("d-flex");
        $("#inhabitant-data").addClass("d-none");
        $("#inhabitant-tabs li").addClass("disabled");
    }
}