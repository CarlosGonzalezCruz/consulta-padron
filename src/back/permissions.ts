import * as db from "./db-queries.js";
import * as utils from "./utils.js";
import * as properties from "./properties.js";
import * as inhabitant from "./inhabitant-data.js";


export async function identify(username :string) {
    let result = await db.getUserRoleByUsername(username);
    if(result == null) {
        if(properties.get("LDAP.allow-self-register", false)) {
            await db.createUser(username, (await getDefaultRole()).id);
            result = await db.getUserRoleByUsername(username);
        } else {
            throw new Error("La configuración del servidor no permite usuarios auto-registrados.");
        }
    }
    return result!;
}


export async function findAuxAdmin(adminUsername :string = "admin") {
    let result = await db.getAuxAdmin();
    if(result == null) {
        try {
            await db.createUser(adminUsername, (await getDefaultRole()).id);
            result = await db.getUserByUsername(adminUsername);
            db.setAuxiliar(result!.id);
        } catch(e) {
            console.error(`No se ha podido crear cuenta auxiliar para el administrador. Causa: ${e}`);
            return {success: false as const, failedRename: false};
        }
    } else if(result.username != adminUsername) {
        let { success } = await db.updateUserUsername(result.id, adminUsername);
        if(!success) {
            console.error(`Se ha intentado renombrar la cuenta ${result.username} a "${adminUsername}" y no se ha podido.`);
            return {success: false as const, failedRename: true};
        }
    }
    return {success: true as const, data: result!};
}


export async function dissolveParentPermissions(role :Role) {
    let newPermissions :RolePermissions = {}
    let parentRole = await db.getRole(role.parent);
    let grandparentRole = parentRole != null ? await db.getRole(parentRole.parent) : null;

    if(grandparentRole == null) {
        newPermissions = await getEffectivePermissions(role);
    } else {
        let currentPermissions = role.entries;
        let [ currentEffectivePermissions, grandparentPermissions ] = await Promise.all([
            await getEffectivePermissions(role),
            await getEffectivePermissions(grandparentRole)
        ]);
        for(let permission in currentPermissions) {
            if(currentPermissions[permission] != null) {
                newPermissions[permission] = currentPermissions[permission];
            } else if(currentEffectivePermissions[permission] != grandparentPermissions[permission]) {
                newPermissions[permission] = currentEffectivePermissions[permission];
            } else {
                newPermissions[permission] = null;
            }
        }
    }

    db.updateRolePermissions(role.id, newPermissions);
}


export async function getEffectivePermissions(role :Role, pendingKeys? :Set<string>) {
    if(pendingKeys == null) {
        pendingKeys = new Set(Array.from(inhabitant.getPermissionEntries()).map(e => e.permissionKey));
    }   
    let currentPermissions = role.entries;
    let ret :EffectiveRolePermissions = {};
    for(let key in currentPermissions) {
        if(pendingKeys.has(key) && currentPermissions[key] != null) {
            ret[key] = currentPermissions[key] as boolean;
            pendingKeys.delete(key);
        }
    }
    if(pendingKeys.size != 0) {
        let parentRole = await db.getRole(role.parent);
        if(parentRole != null) {
            let parentPermissions = await getEffectivePermissions(parentRole, pendingKeys);
            for(let key in parentPermissions) {
                ret[key] = parentPermissions[key];
            }
        } else {
            for(let key of pendingKeys) {
                ret[key] = false;
            }
        }
    }
    return ret;
}


export async function getDefaultRole() {
    let role = await db.getDefaultRole();
    if(role == null) {
        await db.createRole("Predeterminado", {is_registered: true});
        role = await db.getDefaultRole();
    }
    return role!;
}                                       