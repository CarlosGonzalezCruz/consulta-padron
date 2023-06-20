import * as msg from "./message-box.js";
import * as utils from "./utils.js";


export async function fetchAllUsers() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo usuarios...");
    try {
        let data = await fetchRequest("/admin/all-users", "POST", {});
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


export async function fetchAllRoles() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo roles...");
    try {
        let data = await fetchRequest("/admin/all-roles", "POST", {});
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as Role[];
        } else {
            msg.displayMessageBox("No se ha podido obtener los roles.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los roles.", 'error');
        console.error(`Ha ocurrido un problema al obtener los roles. Causa: ${e}`);
        return null;
    }
}


export async function fetchAllUsersWithRole(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo usuarios...");
    try {
        let data = await fetchRequest("/admin/users-by-role", "POST", {roleId});
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {id :number, username :string}[];
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


export async function fetchUser(userId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del usuario...");
    try {
        let data = await fetchRequest("/admin/user", "POST", {userId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as User & Role;
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


export async function fetchRole(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del rol...");
    try {
        let data = await fetchRequest("/admin/role", "POST", {roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as Role;
        } else {
            msg.displayMessageBox("No se ha podido obtener los datos del rol.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los datos del rol.", 'error');
        console.error(`Ha ocurrido un problema al obtener los datos del rol. Causa: ${e}`);
        return null;
    }
}


export async function fetchDefaultRole() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del rol...");
    try {
        let data = await fetchRequest("/admin/role-get-default", "POST", {});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as Role;
        } else {
            msg.displayMessageBox("No se ha podido obtener los datos del rol.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los datos del rol.", 'error');
        console.error(`Ha ocurrido un problema al obtener los datos del rol. Causa: ${e}`);
        return null;
    }
}


export async function fetchPermissionEntries() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo permisos...");
    try {
        let data = await fetchRequest("/admin/permission-entries", "POST", {});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {permissionKey :string, displayKey :string}[];
        } else {
            msg.displayMessageBox("No se ha podido obtener los permisos.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los permisos.", 'error');
        console.error(`Ha ocurrido un problema al obtener los permisos. Causa: ${e}`);
        return null;
    }
}


export async function fetchRoleEffectivePermissions(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo permisos del rol...");
    try {
        let data = await fetchRequest("/admin/get-role-effective-permissions", "POST", {roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as EffectiveRolePermissions;
        } else {
            msg.displayMessageBox("No se ha podido obtener los permisos.", 'error');
            return null;
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al obtener los permisos.", 'error');
        console.error(`Ha ocurrido un problema al obtener los permisos. Causa: ${e}`);
        return null;
    }
}


export async function createNewUser(username :string, onSuccess? :(id :number) => void, onDuplicate? :(id :number) => void) {
    if(!username) {
        msg.displayMessageBox("No deje el nombre de usuario vacío.", 'error');
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Creando nuevo usuario...");
    try {
        let data = await fetchRequest("/admin/user", "PUT", {username});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox(`Se ha creado una cuenta para el usuario ${data.user.username}.`, 'success');
            if(!!onSuccess) onSuccess(data.user.id);
        } else if(data.duplicate) {
            msg.displayMessageBox(`El nombre de usuario introducido ya está en uso para otro usuario.`, 'error');
            if(!!onDuplicate) onDuplicate(data.id);
        } else {
            msg.displayMessageBox(`No se ha podido crear la cuenta de usuario.`, 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al crear la cuenta de usuario.", 'error');
        console.error(`Ha ocurrido un problema al crear la cuenta de usuario. Causa: ${e}`);
    }
}


export async function renameUser(userId :number | null, oldName :string, newName :string, onSuccess? :(id :number) => void) {
    if(userId == null) {
        msg.displayMessageBox("No deje el nombre de usuario vacío.", 'error');
        return;
    }
    if(!newName) {
        console.error("El nombre de usuario no puede quedar vacío.");
        return;
    }
    if(oldName == newName) {
        console.error("El nombre de usuario solicitado es igual al actual. No se actualizará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Aplicando nuevo nombre de usuario...");
    try {
        let data = await fetchRequest("/admin/user-update-username", "POST", {userId, newName});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            if(!!onSuccess) onSuccess(userId);
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


export async function deleteUser(userId :number | null, onSuccess? :() => void) {
    if(userId == null) {
        console.error("No hay usuario seleccionado. No se eliminará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Eliminando usuario...");
    try {
        let data = await fetchRequest("/admin/user", "DELETE", {userId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox("Se ha eliminado los datos del usuario correctamente.", 'success');
            if(!!onSuccess) onSuccess();
        } else {
            msg.displayMessageBox("No se ha podido eliminar los datos del usuario.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al eliminar los datos del usuario.", 'error');
        console.error(`Ha ocurrido un problema al eliminar los datos del usuario. Causa: ${e}`);
    }
}


export async function createNewRole(rolename :string, parentId :number | null, onSuccess? :(id :number) => void) {
    if(!rolename) {
        msg.displayMessageBox("No deje el nombre del rol vacío.", 'error');
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Creando nuevo rol...");
    try {
        let data = await fetchRequest("/admin/role", "PUT", {rolename, parentId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox(`Se ha creado el rol ${data.role.name}.`, 'success');
            if(!!onSuccess) onSuccess(data.role.id);
        } else {
            msg.displayMessageBox(`No se ha podido crear el rol.`, 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al crear el rol.", 'error');
        console.error(`Ha ocurrido un problema al crear el rol. Causa: ${e}`);
    }
}


export async function renameRole(roleId :number | null, oldName :string, newName :string, onSuccess? :(id :number) => void) {
    if(roleId == null) {
        msg.displayMessageBox("No deje el nombre de usuario vacío.", 'error');
        return;
    }
    if(!newName) {
        console.error("El nombre del rol no puede quedar vacío.");
        return;
    }
    if(oldName == newName) {
        console.error("El nombre solicitado para el rol es igual al actual. No se actualizará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Aplicando nuevo nombre de rol...");
    try {
        let data = await fetchRequest("/admin/role-update-name", "POST", {roleId, newName});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            if(!!onSuccess) onSuccess(roleId);
        } else {
            msg.displayMessageBox("No se ha podido actualizar el nombre del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el nombre del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el nombre del rol. Causa: ${e}`);
    }
}


export async function toggleRoleAdmin(roleId :number | null, currentValue :DBBinary, onSuccess? :(id :number) => void) {
    if(roleId == null) {
        console.error("No hay rol seleccionado. No se actualizará nada.");
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Cambiando rango de administrador...");
    try {
        let data = await fetchRequest("/admin/role-update-admin", "POST", {roleId, isAdmin: currentValue != 'T'});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            if(!!onSuccess) onSuccess(roleId);
        } else {
            msg.displayMessageBox("No se ha podido actualizar el rango del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el rango del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el rango del rol. Causa: ${e}`);
    }
}


export async function toggleRoleDefault(roleId :number | null, onSuccess? :() => void) {
    if(roleId == null) {
        console.error("No hay rol seleccionado. No se actualizará nada.");
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Cambiando estatus de predeterminado...");
    try {
        let data = await fetchRequest("/admin/role-set-default", "POST", {roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            if(!!onSuccess) onSuccess();
        } else {
            msg.displayMessageBox("No se ha podido actualizar el estatus del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el estatus del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el estatus del rol. Causa: ${e}`);
    }
}


export async function updateRolePermissions(roleId :number | null, permissions :any) {
    if(roleId == null) {
        console.error("No hay rol seleccionado. No se actualizará nada.");
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Actualizando permisos del rol...");
    try {
        let data = await fetchRequest("/admin/role-update-permissions", "POST", {roleId, permissions});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox("Permisos del rol actualizados.", 'success');
        } else {
            msg.displayMessageBox("No se ha podido actualizar los permisos del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar los permisos del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar los permisos del rol. Causa: ${e}`);
    }
}


async function fetchRequest(uri :string, rest :RequestMethod, body :any) {
    let fetchRequest = await fetch(uri, {
        method: rest,
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body)
    });
    return fetchRequest.json();
}