import * as db from "./db-queries.js";


export async function identify(username :string) {
    let result = await db.getUserRole(username);
    if(result == null) {
        await db.createUser(username, (await getDefaultRole()).id);
        result = await db.getUserRole(username);
    }
    return result!;
}


export async function getDefaultRole() {
    let role = await db.getDefaultRole();
    if(role == null) {
        await db.createRole("default");
        role = await db.getDefaultRole();
    }
    return role!;
}