import * as db from "./db-queries.js";
import * as utils from "./utils.js";


export async function identify(username :string) {
    let result = await db.getUserRole(username);
    if(result == null) {
        await db.createUser(username, (await getDefaultRole()).id);
        result = await db.getUserRole(username);
    }
    return result!;
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