import * as db from "./db-queries.js";
import * as utils from "./utils.js";


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


export async function getEffectivePermissions(role :Role) {
    let entries = utils.bufferToJson(role.entries);
    let ret :string[] = [];
    for(let entry in entries) {
        if(entries[entry] == true) {
            ret.push(entry);
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