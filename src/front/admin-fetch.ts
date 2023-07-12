import * as msg from "./message-box.js";
import * as utils from "./utils.js";


// Este módulo lleva todas las conexiones del panel de administrador al servidor. Para poder realizar estas operaciones, es
// necesario que el token de sesión sea de administrador.


/** Obtiene una lista con el id y el nombre de todos los usuarios registrados. */
export async function fetchAllUsers() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo usuarios...");
    try {
        let data = await fetchRequest("/admin/all-users", "POST", {});
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {id :number, username :string}[];
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene una lista con el id y el nombre de todos los roles. */
export async function fetchAllRoles() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo roles...");
    try {
        let data = await fetchRequest("/admin/all-roles", "POST", {});
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {id :number, name :string}[];
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene una lista con el id y el nombre de todos los usuarios que tienen el rol indicado. */
export async function fetchAllUsersWithRole(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo usuarios...");
    try {
        let data = await fetchRequest("/admin/users-by-role", "POST", {roleId});
        utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {id :number, username :string}[];
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene todos los datos del usuario indicado y de su rol. */
export async function fetchUser(userId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del usuario...");
    try {
        let data = await fetchRequest("/admin/user", "POST", {userId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as User & Role;
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene todos los datos del rol indicado. */
export async function fetchRole(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del rol...");
    try {
        let data = await fetchRequest("/admin/role", "POST", {roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as Role;
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene los datos del rol marcado como predeterminado. */
export async function fetchDefaultRole() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo datos del rol...");
    try {
        let data = await fetchRequest("/admin/role-get-default", "POST", {});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as Role;
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene la lista de todas las entradas a las que se puede aplicar permisos.  */
export async function fetchPermissionEntries() {
    let loadingHandler = msg.displayLoadingBox("Obteniendo permisos...");
    try {
        let data = await fetchRequest("/admin/permission-entries", "POST", {});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as {permissionKey :string, displayKey :string}[];
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Obtiene las entradas que el rol indicado puede consultar de manera efectiva, considerando su rol base. */
export async function fetchRoleEffectivePermissions(roleId :number) {
    let loadingHandler = msg.displayLoadingBox("Obteniendo permisos del rol...");
    try {
        let data = await fetchRequest("/admin/get-role-effective-permissions", "POST", {roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data as EffectiveRolePermissions;
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Crea una nueva cuenta de usuario. `onSuccess` se ejecutará si se crea la cuenta, con el id asignado a la nueva cuenta.
 * `onDuplicate` se ejecutará si no se ha podido crear la cuenta por repetir nombres de usuario, con el id de la cuenta que ya tiene ese nombre.
 */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Solicita un cambio de nombre para el usuario indicado. `onSuccess` se ejecutará cuando el servidor confirme el cambio de nombre. */
export async function renameUser(userId :number | null, oldName :string, newName :string, onSuccess? :(id :number) => void) {
    if(userId == null) {
        console.error("No hay usuario seleccionado. No se actualizará nada.", 'error');
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
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


/** Asigna el rol indicado al usuario indicado. */
export async function updateUserRole(userId :number | null, roleId :number) {
    if(userId == null) {
        console.error("No hay usuario seleccionado. No se actualizará nada.", 'error');
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Cambiando rol de usuario...");
    try {
        let data = await fetchRequest("/admin/user-update-role", "POST", {userId, roleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            return data.data;
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido cambiar el rol al usuario.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al cambiar el rol al usuario.", 'error');
        console.error(`Ha ocurrido un problema al cambiar el rol al usuario. Causa: ${e}`);
    }
}


/** Solicita eliminar la cuenta de usuario indicada. `onSuccess` se ejecutará cuando el servidor confirme la eliminación. */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido eliminar los datos del usuario.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al eliminar los datos del usuario.", 'error');
        console.error(`Ha ocurrido un problema al eliminar los datos del usuario. Causa: ${e}`);
    }
}


/** Solicita la creación de un rol nuevo. `parentId` es el id del que será el rol base. `onSuccess` se ejecutará una vez se confirme
 *  la creación del rol y recibirá el id del rol por parámetro.
 */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox(`No se ha podido crear el rol.`, 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al crear el rol.", 'error');
        console.error(`Ha ocurrido un problema al crear el rol. Causa: ${e}`);
    }
}


/** Solicita un cambio de nombre para el rol solicitado. El parámetro `oldName` solo se usa para validar. `onSuccess` se ejecutará
  * cuando se confirme el cambio de nombre.
  */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido actualizar el nombre del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el nombre del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el nombre del rol. Causa: ${e}`);
    }
}


/** Solicita el cambio de estatus de administrador para el rol indicado. `onSuccess` se ejecutará cuando el servidor confirme el cambio. */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido actualizar el rango del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el rango del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el rango del rol. Causa: ${e}`);
    }
}


/** Solicita el cambio de rol predeterminado al indicado. `onSuccess` se ejecutará cuando el servidor confirme el cambio. */
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else if(data.missing) {
            msg.displayMessageBox("El anterior rol predeterminado ya no existe.", 'error');
        } else {
            msg.displayMessageBox("No se ha podido actualizar el estatus del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar el estatus del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar el estatus del rol. Causa: ${e}`);
    }
}


/** Solicita una actualización de permisos del rol indicado a los permisos proporcionados. */
export async function updateRolePermissions(roleId :number | null, permissions :RolePermissions) {
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
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido actualizar los permisos del rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar los permisos del rol.", 'error');
        console.error(`Ha ocurrido un problema al actualizar los permisos del rol. Causa: ${e}`);
    }
}


/** Solicita un cambio del rol base del rol indicado. */
export async function updateRoleParent(roleId :number | null, parentId :number | null) {
    if(roleId == null) {
        console.error("No hay rol seleccionado. No se actualizará nada.");
        return;
    }

    let loadingHandler = msg.displayLoadingBox("Actualizando jerarquía de roles...");
    try {
        let data = await fetchRequest("/admin/role-update-parent", "POST", {roleId, parentId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox("Jerarquía de roles actualizada.", 'success');
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else if(data.cyclic) {
            msg.displayMessageBox("Un rol no puede basarse en sí mismo, directa o indirectamente.", 'error');
        } else {
            msg.displayMessageBox("No se ha podido actualizar la jerarquía de roles.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al actualizar la jerarquía de roles.", 'error');
        console.error(`Ha ocurrido un problema al actualizar la jerarquía de roles. Causa: ${e}`);
    }
}


/** Solicita la eliminación del rol indicado. Si hay al menos un usuario con dicho rol, se debe proveer también un rol de reemplazo
 *  mediante `replaceWithRoleId`. En caso contrario, el servidor no eliminará el rol.
 */
export async function deleteRole(roleId :number | null, replaceWithRoleId :number | null) {
    if(roleId == null) {
        console.error("No hay rol seleccionado. No se eliminará nada.");
        return;
    }
    let loadingHandler = msg.displayLoadingBox("Eliminando rol...");
    try {
        let data = await fetchRequest("/admin/role", "DELETE", {roleId, replaceWithRoleId});
        await utils.concludeAndWait(loadingHandler);
        if(data.success) {
            msg.displayMessageBox("Se ha eliminado el rol correctamente.", 'success');
        } else if(data.expired) {
            msg.displayMessageBox("Su sesión ha caducado. Por favor, inicie sesión de nuevo.", 'error',
                () => window.location.href = "/login");
        } else {
            msg.displayMessageBox("No se ha podido eliminar el rol.", 'error');
        }
    } catch(e) {
        await utils.concludeAndWait(loadingHandler);
        msg.displayMessageBox("Ha ocurrido un problema al eliminar el rol.", 'error');
        console.error(`Ha ocurrido un problema al eliminar el rol. Causa: ${e}`);
    }
}


/** Envía una petición REST a un endpoint del servidor. */
async function fetchRequest(uri :string, rest :RequestMethod, body :any) {
    let fetchRequest = await fetch(uri, {
        method: rest,
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body)
    });
    return fetchRequest.json();
}