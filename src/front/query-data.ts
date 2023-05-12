import * as utils from "./utils.js";
import * as msg from "./message-box.js";


export async function enableSearch() {
    await utils.documentReady();

    $("#inhabitant-id-field").on("keypress", e => {
        if(e.key == "Enter") {
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
    console.log(result);
    $("#inhabitant-name").text(result.NOMBRE_COMPLETO);
    loadingHandler.conclude();
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

    return data.length > 0 ? data[0] : null;
}