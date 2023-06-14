import * as query from "./query-data.js";
import * as msg from "./message-box.js";
import * as utils from "./utils.js";

const SEARCH_TIMEOUT_MS = 300;

let selectedUser :number | null = null;
let selectedUsername :string = "";

let listFilter :string = "";
let searchTimeout :NodeJS.Timeout | null = null;

export async function enableButtons() {
    await utils.documentReady();

    $("#user-button-create").on("click", () => {
        focusModalInputField($("#modal-create-user"));
        $("#modal-create-user").modal("show");
    });
    $("#user-field-username-edit").on("click", () => {
        $("#modal-update-username-selected-username").text(selectedUsername);
        $("#modal-update-username-input-field").val(selectedUsername);
        focusModalInputField($("#modal-update-username"));
        $("#modal-update-username").modal("show");
    });
    $("#user-button-delete").on("click", function() {
        if($(this).is(".disabled")) {
            return;
        }
        $("#modal-delete-user-selected-username").text(selectedUsername);
        $("#modal-delete-user").modal("show");
    });

    bindModalSubmitToInput($("#modal-create-user-input-field"), $("#modal-create-user-confirm"));
    bindModalSubmitToInput($("#modal-update-username-input-field"), $("#modal-update-username-confirm"));

    $("#modal-create-user-confirm").on("click", async function() {
        if(!$(this).is(".disabled")) {
            $("#modal-create-user").modal("hide");
            await createNewUser();
        }
    });
    $("#modal-update-username-confirm").on("click", async function() {
        if(!$(this).is(".disabled")) {
            $("#modal-update-username").modal("hide");
            await renameSelectedUser();
        }
    });
    $("#modal-delete-user-confirm").on("click", async () => {
        await deleteSelectedUser();
    });
    enableSearch();
}


export function enableSessionLinks() {
    $("#admin-link").on("click", () => {
        window.location.href = "/query";
    })
    $("#session-logout").on("click", () => {
        query.doLogout();
    });
}


export async function populateUsersTable() {
    let usersData = await fetchAllUsers();
    const TABLE = $("#user-role-list");
    TABLE.empty();
    for(let user of usersData) {
        if(!entryMatchesFilter(user.username)) {
            continue;
        }
        let row = $("<tr>");
        let element = $("<td>");
        element.attr("user-id", user.id);
        element.text(user.username);
        assignUserItemClickEvent(element);
        row.append(element);
        TABLE.append(row);
    }
}


function entryMatchesFilter(entry :string) {
    if(!listFilter) {
        return true;
    } else {
        return entry.includes(listFilter);
    }
}


function assignUserItemClickEvent(elem :JQuery) {
    elem.on("click", function() {
        selectedUser = Number($(this).attr("user-id"));
        updateSelectedItem();
        updateDetailsScreen();
    });
}


function updateSelectedItem() {
    $("#user-role-list .active").removeClass("active");
    if(selectedUser != null) {
        $(`#user-role-list td[user-id='${selectedUser}']`).addClass("active");
    }
}


async function updateDetailsScreen() {
    if(selectedUser == null) {
        $("#default-user-placeholder").addClass("d-flex");
        $("#default-user-placeholder").removeClass("d-none");
        $("#user-details-panel").addClass("d-none");
        $("#user-details-panel").removeClass("d-flex");
    } else {
        $("#default-user-placeholder").addClass("d-none");
        $("#default-user-placeholder").removeClass("d-flex");
        $("#user-details-panel").removeClass("d-none");
        $("#user-details-panel").addClass("d-flex");

        let userData = await fetchUser(selectedUser);
        if(userData == null) {
            msg.displayMessageBox("No se ha podido obtener los datos del usuario.", 'error');
            selectedUsername = "";
        } else {
            $("#user-field-username").text(userData.username);
            $("#user-field-role").text(userData.name);
            selectedUsername = userData.username;
            updateDetailsScreenForAuxAdmin(userData.isAuxiliar == 'T');
        }
    }
}


function updateDetailsScreenForAuxAdmin(isAuxAdmin :boolean) {
    if(isAuxAdmin) {
        $("#user-details-aux-admin-warning").removeClass("d-none");
        $("#user-field-username-edit").addClass("d-none");
        $("#user-button-delete").addClass("disabled");
    } else {
        $("#user-details-aux-admin-warning").addClass("d-none");
        $("#user-field-username-edit").removeClass("d-none");
        $("#user-button-delete").removeClass("disabled");
    }
}


function focusModalInputField(modal :JQuery) {
    modal.one("shown.bs.modal", () => {
        modal.find("input[type='text']").get(0)?.focus();
        modal.find("input[type='text']").trigger("select");
    });
}


function bindModalSubmitToInput(inputField :JQuery, submitButton :JQuery) {
    inputField.on("input", function() {
        if(!$(this).val()) {
            submitButton.addClass("disabled");
        } else {
            submitButton.removeClass("disabled");
        }
    });
    if(!inputField.val()) {
        submitButton.addClass("disabled");
    } else {
        submitButton.removeClass("disabled");
    }
}


async function selectUser(userId :number | null) {
    selectedUser = userId;
    await Promise.all([
        updateDetailsScreen(),
        populateUsersTable()
    ]); 
    updateSelectedItem();
}


function enableSearch() {
    $("#search-field").on("input", function() {
        if(!!searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(async () => {
            listFilter = $(this).val() as string;
            await populateUsersTable();
            updateSelectedItem();
            searchTimeout = null;
        }, SEARCH_TIMEOUT_MS);
    });
}


async function fetchAllUsers() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo usuarios...");
    try {
        let fetchRequest = await fetch("/admin/all-users", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include"
        });
        let data = await fetchRequest.json();
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data;
        } else {
            msg.displayMessageBox("No se ha podido obtener los usuarios.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los usuarios.", 'error');
        console.error(`Ha ocurrido un problema al obtener los usuarios. Causa: ${e}`);
        return null;
    }
}


async function fetchUser(id :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del usuario...");
    try {
        let fetchRequest = await fetch("/admin/user", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                userId: id
            }),
            credentials: "include"
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data;
        } else {
            msg.displayMessageBox("No se ha podido obtener los datos del usuario.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los datos del usuario.", 'error');
        console.error(`Ha ocurrido un problema al obtener los datos del usuario. Causa: ${e}`);
        return null;
    }
}


async function createNewUser() {
    let username = $("#modal-create-user-input-field").val();
    if(!$("#modal-create-user-input-field").val()) {
        msg.displayMessageBox("No deje el nombre de usuario vacío.", 'error');
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Creando nuevo usuario...");
    try {
        let fetchRequest = await fetch("/admin/user", {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                username
            }),
            credentials: "include"
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox(`Se ha creado una cuenta para el usuario ${data.user.username}.`, 'success');
            selectUser(data.user.id);
        } else if(data.duplicate) {
            msg.displayMessageBox(`El nombre de usuario introducido ya está en uso para otro usuario.`, 'error');
            selectUser(data.id);
        } else {
            msg.displayMessageBox(`No se ha podido crear la cuenta de usuario.`, 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al crear la cuenta de usuario.", 'error');
        console.error(`Ha ocurrido un problema al crear la cuenta de usuario. Causa: ${e}`);
    }
}


async function renameSelectedUser() {
    if(selectedUser == null) {
        msg.displayMessageBox("No deje el nombre de usuario vacío.", 'error');
        return;
    }
    if(!$("#modal-update-username-input-field").val()) {
        console.error("El nombre de usuario no puede quedar vacío.");
        return;
    }
    if(selectedUsername == $("#modal-update-username-input-field").val()) {
        console.error("El nombre de usuario solicitado es igual al actual. No se actualizará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Aplicando nuevo nombre de usuario...");
    try {
        let fetchRequest = await fetch("/admin/user-update-username", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                userId: selectedUser,
                newName: $("#modal-update-username-input-field").val()
            }),
            credentials: "include"
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            selectUser(selectedUser);
        } else if(data.reserved) {
            msg.displayMessageBox("El nombre de usuario introducido está reservado para el servidor. Elija otro o modifique las propiedades del servidor.", 'error');
        } else if(data.duplicate) {
            msg.displayMessageBox("El nombre de usuario introducido ya está en uso para otro usuario. Elija otro.", 'error');
        } else {
            msg.displayMessageBox("No se ha podido actualizar el nombre del usuario.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el nombre del usuario.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el nombre del usuario. Causa: ${e}`);
    }
}


async function deleteSelectedUser() {
    if(selectedUser == null) {
        console.error("No hay usuario seleccionado. No se eliminará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Eliminando usuario...");
    try {
        let fetchRequest = await fetch("/admin/user", {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                userId: selectedUser
            }),
            credentials: "include"
        });
        let data = await fetchRequest.json();
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox("Se ha eliminado los datos del usuario correctamente.", 'success');
            selectUser(null);
        } else {
            msg.displayMessageBox("No se ha podido eliminar los datos del usuario.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al eliminar los datos del usuario.", 'error');
        console.error(`Ha ocurrido un problema al eliminar los datos del usuario. Causa: ${e}`);
    }
}