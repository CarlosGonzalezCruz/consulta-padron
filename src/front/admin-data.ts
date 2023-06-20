import * as query from "./query-data.js";
import * as msg from "./message-box.js";
import * as utils from "./utils.js";
import * as adminFetch from "./admin-fetch.js";

const SEARCH_TIMEOUT_MS = 300;

let selectedUser :number | null = null;
let selectedUsername :string = "";
let selectedRole :number | null = null;
let selectedRolename :string = "";

let listCategory :"users" | "roles" = "users";
let listFilter :string = "";
let searchTimeout :NodeJS.Timeout | null = null;
let lastDefaultRole :number | null = null;
let creatingChildRole = false;
let selectedRoleInheritedPermissions :EffectiveRolePermissions = {};

export async function initialize() {
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
    $("#role-button-create").on("click", () => {
        creatingChildRole = false;
        focusModalInputField($("#modal-create-role"));
        $("#modal-create-role").modal("show");
    });
    $("#role-button-extend").on("click", () => {
        creatingChildRole = true;
        focusModalInputField($("#modal-create-role"));
        $("#modal-create-role").modal("show");
    });
    $("#role-button-permissions").on("click", async () => {
        await prepareRolePermissionsModal("Seleccione las entradas que los usuarios con este rol pueden consultar.");
        $("#modal-role-permissions").modal("show");
    });
    $("#role-field-name-edit").on("click", () => {
        $("#modal-update-rolename-selected-username").text(selectedRolename);
        $("#modal-update-rolename-input-field").val(selectedRolename);
        focusModalInputField($("#modal-update-rolename"));
        $("#modal-update-rolename").modal("show");
    });
    $("#role-field-is-admin-edit").on("click", async () => {
        await adminFetch.toggleRoleAdmin(selectedRole, $("#role-field-is-admin").attr("value") as DBBinary, selectRole);
    });
    $("#role-field-is-default-edit").on("click", async () => {
        await toggleDefaultRole();
    })
    
    $("#modal-create-user-confirm").on("click", async function() {
        if(!$(this).is(".disabled")) {
            $("#modal-create-user").modal("hide");
            await adminFetch.createNewUser($("#modal-create-user-input-field").val() as string, selectUser, selectUser);
        }
    });
    $("#modal-update-username-confirm").on("click", async function() {
        if(!$(this).is(".disabled")) {
            $("#modal-update-username").modal("hide");
            await adminFetch.renameUser(selectedUser, selectedUsername, $("#modal-update-username-input-field").val() as string, selectUser);
        }
    });
    $("#modal-delete-user-confirm").on("click", async () => {
        $("#modal-delete-user").modal("hide");
        await adminFetch.deleteUser(selectedUser, () => selectUser(null));
    });
    $("#modal-create-role-confirm").on("click", async () => {
        $("#modal-create-role").modal("hide");
        await adminFetch.createNewRole($("#modal-create-role-input-field").val() as string, creatingChildRole ? selectedRole : null, selectRole);
    });
    $("#modal-update-rolename-confirm").on("click", async () => {
        $("#modal-update-rolename").modal("hide");
        await adminFetch.renameRole(selectedRole, selectedRolename, $("#modal-update-rolename-input-field").val() as string, selectRole);
    });
    $("#modal-role-permissions-confirm").on("click", async () => {
        $("#modal-role-permissions").modal("hide");
        let permissions = readSelectedPermissions($("#modal-role-permissions-table"));
        await adminFetch.updateRolePermissions(selectedRole, permissions);
    });

    $("#user-role-tabs li").on("click", function() {
        updateTabs($(this));
    });
    updateTabs($("#user-role-tabs li[tab-content='users']"));

    bindModalSubmitToInput($("#modal-create-user-input-field"), $("#modal-create-user-confirm"));
    bindModalSubmitToInput($("#modal-update-username-input-field"), $("#modal-update-username-confirm"));
    bindModalSubmitToInput($("#modal-create-role-input-field"), $("#modal-create-role-confirm"));
    bindModalSubmitToInput($("#modal-update-rolename-input-field"), $("#modal-update-rolename-confirm"));
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


export async function populateList() {
    let data = listCategory == "users" ? await adminFetch.fetchAllUsers() : await adminFetch.fetchAllRoles();
    const TABLE = $("#user-role-list");
    TABLE.empty();

    if(listCategory == "users") {
        for(let user of data) {
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
    } else if(listCategory == "roles") {
        for(let role of data) {
            if(!entryMatchesFilter(role.name)) {
                continue;
            }
            let row = $("<tr>");
            let element = $("<td>");
            element.attr("role-id", role.id);
            element.text(role.name);
            assignUserItemClickEvent(element);
            row.append(element);
            TABLE.append(row);
        }   
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
        if(listCategory == "users") {
            selectedUser = Number($(this).attr("user-id"));
        } else {
            selectedRole = Number($(this).attr("role-id"));
        }
        updateSelectedItem();
        updateDetailsScreen();
    });
}


function updateSelectedItem() {
    $("#user-role-list .active").removeClass("active");
    if(listCategory == "users" && selectedUser != null) {
        $(`#user-role-list td[user-id='${selectedUser}']`).addClass("active");
    }
    if(listCategory == "roles" && selectedRole != null) {
        $(`#user-role-list td[role-id='${selectedRole}']`).addClass("active");
    }
}


async function updateDetailsScreen() {
    utils.playCssAnimationOnce($("#user-role-details-container > *"), "fade-in");

    if(listCategory == "users") {
        $("#default-role-placeholder").addClass("d-none").removeClass("d-flex");
        $("#role-details-panel").addClass("d-none").removeClass("d-flex");

        if(selectedUser == null) {
            $("#default-user-placeholder").addClass("d-flex").removeClass("d-none");
            $("#user-details-panel").addClass("d-none").removeClass("d-flex");
        } else {
            $("#default-user-placeholder").addClass("d-none").removeClass("d-flex");
            $("#user-details-panel").addClass("d-flex").removeClass("d-none");
    
            let userData = await adminFetch.fetchUser(selectedUser);
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
    } else if(listCategory == "roles") {
        $("#default-user-placeholder").addClass("d-none").removeClass("d-flex");
        $("#user-details-panel").addClass("d-none").removeClass("d-flex");

        if(selectedRole == null) {
            $("#default-role-placeholder").addClass("d-flex").removeClass("d-none");
            $("#role-details-panel").addClass("d-none").removeClass("d-flex");
        } else {
            $("#default-role-placeholder").addClass("d-none").removeClass("d-flex");
            $("#role-details-panel").addClass("d-flex").removeClass("d-none");
    
            let roleData = await adminFetch.fetchRole(selectedRole);
            if(roleData == null) {
                msg.displayMessageBox("No se ha podido obtener los datos del rol.", 'error');
                selectedRolename = "";
            } else { 
                selectedRolename = roleData.name;
                $("#role-field-name").text(roleData.name);
                $("#role-field-is-default").attr("value", roleData.isDefault).text(`${utils.writeBoolean(roleData.isDefault)}`);
                $("#role-field-is-admin").attr("value", roleData.isAdmin).text(`${utils.writeBoolean(roleData.isAdmin)}`);
                $("#role-field-parent").text("");
                $("#role-field-user-amount").text("");


                if(roleData.isDefault == 'T') {
                    $("#role-button-delete").addClass("disabled");
                    if(lastDefaultRole == null || lastDefaultRole == roleData.id) {
                        $("#role-field-is-default-edit").addClass("d-none");
                    } else {
                        $("#role-field-is-default-edit").removeClass("d-none");
                    }
                } else {
                    $("#role-button-delete").removeClass("disabled");
                    $("#role-field-is-default-edit").removeClass("d-none");
                }
                
                let [ parentRoleData, usersWithRole ] = await Promise.all([
                    adminFetch.fetchRole(roleData.parent),
                    adminFetch.fetchAllUsersWithRole(selectedRole)
                ]);
                $("#role-field-user-amount").text(displayUsersWithRole(usersWithRole!));
                if(parentRoleData != null) {
                    $("#role-field-parent").text(parentRoleData.name);
                } else {
                    $("#role-field-parent").html("<span class='text-muted'>Ninguno</span>")
                }

            }
        }
    }
}


function displayUsersWithRole(users :{id :number, username :string}[]) {
    if(users.length == 0 || users.length >= 10) {
        return users.length.toString();
    } else {
        let text = users.map(u => u.username).join(", ");
        if(text.length > 50) {
            return users.length.toString();
        } else {
            return text;
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


async function updateTabs(clickedTab :JQuery) {
    $("#user-role-tabs li").removeClass("active");
    clickedTab.addClass("active");
    listCategory = $(clickedTab).attr("tab-content") as "users" | "roles";

    if(listCategory == "users") {
        $("#user-button-create").removeClass("d-none");
        $("#role-button-create").addClass("d-none");
    } else if(listCategory == "roles") {
        $("#user-button-create").addClass("d-none");
        $("#role-button-create").removeClass("d-none");
    }

    await Promise.all([
        updateDetailsScreen(),
        populateList().then(updateSelectedItem)
    ]);
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
        populateList()
    ]);
    updateSelectedItem();
}


async function selectRole(roleId :number | null) {
    selectedRole = roleId;
    await Promise.all([
        updateDetailsScreen(),
        populateList()
    ]);
    updateSelectedItem();
}


async function toggleDefaultRole() {
    let currentDefault = await adminFetch.fetchDefaultRole();
    if(!!currentDefault && currentDefault.id != selectedRole) {
        lastDefaultRole = currentDefault.id;
        await adminFetch.toggleRoleDefault(selectedRole, () => selectRole(selectedRole));
    } else if(lastDefaultRole != null) {
        await adminFetch.toggleRoleDefault(lastDefaultRole, () => selectRole(selectedRole));
    }
}


function enableSearch() {
    $("#search-field").on("input", function() {
        if(!!searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(async () => {
            listFilter = $(this).val() as string;
            await populateList();
            updateSelectedItem();
            searchTimeout = null;
        }, SEARCH_TIMEOUT_MS);
    });
}


async function prepareRolePermissionsModal(caption :string) {
    if(selectedRole == null) {
        return;
    }
    $("#modal-role-permissions-rolename").text(selectedRolename);
    $("#modal-role-permissions-caption").text(caption);

    let template = $("#modal-role-permissions-table-row-template");
    $("#modal-role-permissions-table").children(":not(#modal-role-permissions-table-row-template)").remove();

    let [ entries, roleData ] = await Promise.all([
        adminFetch.fetchPermissionEntries(),
        adminFetch.fetchRole(selectedRole),
    ]);
    selectedRoleInheritedPermissions = await adminFetch.fetchRoleEffectivePermissions(roleData!.parent) as EffectiveRolePermissions;
    let permissions = JSON.parse(roleData!.entries);
    for(let entry of entries!) {
        generateRolePermissionsRow({
            permissionKey: entry.permissionKey,
            displayKey: entry.displayKey,
            hasParent: roleData?.parent != null,
            inherited: permissions[entry.permissionKey] == null,
            allowed: permissions[entry.permissionKey],
        }, template, $("#modal-role-permissions-table"));
    }
}


function generateRolePermissionsRow(data :any, template :JQuery<Element>, tableBody :JQuery<HTMLElement>) {
    let row = template.clone();
    row.removeAttr("id");
    row.attr("permission-key", data.permissionKey);
    let rowHtml = row.html();

    // Find all {{placeholders}} and replace them with the value corresponding to the field of the same name in received data
    let matches = rowHtml.matchAll(/{{(\w*)}}/g);

    for(let match of matches) {
        if(match[1] in data) {
            rowHtml = rowHtml.replace(match[0], data[match[1]] == null ? '—' : data[match[1]]);
        }
    }

    row.html(rowHtml);
    let allowCheckbox = row.find("input[field='allow']");
    let inheritCheckbox = row.find("input[field='inherit']");
    if(data.hasParent) {
        inheritCheckbox.parent().removeClass("d-none");
        inheritCheckbox.on("click", () => {
            allowCheckbox.attr("disabled", inheritCheckbox.prop("checked"));
            if(inheritCheckbox.prop("checked")) {
                allowCheckbox.prop("checked", selectedRoleInheritedPermissions[row.attr("permission-key") as string]);
            }
        });
    }
    if(data.inherited && data.hasParent) {
        inheritCheckbox.prop('checked', true);
        allowCheckbox.attr('disabled', 'disabled');
        allowCheckbox.prop('checked', selectedRoleInheritedPermissions[row.attr("permission-key") as string]);
    } else if(data.allowed) {
        allowCheckbox.prop('checked', true);
    }
    row.find("small[field='allow']").on("click", () => allowCheckbox.trigger("click"));
    row.find("small[field='inherit']").on("click", () => inheritCheckbox.trigger("click"));

    tableBody.append(row);
    row.show();
}


function readSelectedPermissions(tableBody :JQuery<HTMLElement>) {
    let ret :RolePermissions = {};
    for(let child of tableBody.children("tr:visible")) {
        let key = $(child).attr("permission-key") as string;
        let inherit = $(child).find("input[field='inherit']").prop('checked') as boolean;
        let allow = $(child).find("input[field='allow']").prop('checked') as boolean;
        ret[key!] = inherit ? null : allow;
    }
    return ret;
}