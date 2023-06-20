import * as db from "./db-queries.js";
import * as utils from "./utils.js";
import * as inhabitant from "./inhabitant-data.js";


export async function identify(username :string) {
    let result = await db.getUserRoleByUsername(username);
    if(result == null) {
        await db.createUser(username, (await getDefaultRole()).id);
        result = await db.getUserRoleByUsername(username);
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


export async function getEffectivePermissions(role :Role, pendingKeys? :Set<string>) {
    if(pendingKeys == null) {
        pendingKeys = new Set(Array.from(inhabitant.getPermissionEntries()).map(e => e.permissionKey));
    }   
    let currentPermissions = utils.bufferToJson(role.entries);
    let ret :EffectiveRolePermissions = {};
    for(let key in currentPermissions) {
        if(pendingKeys.has(key)) {
            ret[key] = currentPermissions[key];
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
        await db.createRole("default", {full_name: true, is_registered: true});
        role = await db.getDefaultRole();
    }
    return role!;
}                                       