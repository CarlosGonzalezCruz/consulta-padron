import fs from "fs";
import https from "https";
import express from "express";
import * as inhabitant from "./inhabitant-data.js"
import * as properties from "./properties.js";
import * as permissions from "./permissions.js";
import * as db from "./db-queries.js";
import * as login from "./login.js";
import * as validation from "./validation.js";
import * as utils from "./utils.js";


const APP = express();

export async function listen() {
    login.setup(APP);
    let httpsPort = properties.get<number>("Application.https-port");
    let httpPort = properties.get<number | null>("Application.http-port", null);
    https.createServer({
        key: fs.readFileSync(properties.get<string>("Application.ssl-key")),
        cert: fs.readFileSync(properties.get<string>("Application.ssl-cert"))
    }, APP).listen(httpsPort, () => {
        console.log(`(https) Atendiendo al puerto ${httpsPort}...`);
        if(httpPort != null) {
            setupHttpToHttpsRedirect(httpPort, httpsPort);
        }
    });

}

process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});

function setupHttpToHttpsRedirect(httpPort :number, httpsPort :number) {
    let httpApp = express();
    let targetHost = (req :any) => req.headers.host.replace(/(\w*):(\d{1,5})/, `$1:${httpsPort}`);
    httpApp.get("*", (req, res) => res.redirect(`https://${targetHost(req)}${req.url}`));
    httpApp.listen(httpPort);
    console.log(`(http) Atendiendo al puerto ${httpPort}...`);
}


APP.use(express.static("web"));
APP.use(express.static("out/front"));
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

endpoint('/', "GET", (request, result) => {
    result.redirect("/login");
});

endpoint('/login', "GET", (request, result) => {
    result.sendFile("login.html", {root: "web"});
});

endpoint('/query', "GET", (request, result) => {
    result.sendFile("query.html", {root: "web"});
});

endpoint('/admin', "GET", (request, result) => {
    result.sendFile("admin.html", {root: "web"});
});

endpoint('/environment-label', "GET", (request, result) => {
    result.send(properties.get("Application.environment-label", ""));
});

endpoint("/login", "POST", (request, result) => {
    login.tryLogin(request, result);
});

endpoint("/logout", "POST", (request, result) => {
    login.tryLogout(request, result);
});

endpoint("/am-i-admin", "POST", (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success) {
        result.send({admin: false});
    } else {
        result.send({admin: data.data.isAdmin});
    }
})

endpoint("/inhabitant-data-id", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success) {
        result.send({success: false, expired: data.expired, unauthorized: false});
    } else {
        if(!validation.check(request.body.id, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, unauthorized: false});
            return;
        }
        let userRole = await permissions.identify(data.data.username || data.data.user);
        let effectivePermissions = await permissions.getEffectivePermissions(userRole);
        let allowedKeys = Object.entries(effectivePermissions).filter(e => e[1]).map(e => e[0]);
        result.send({success: true, data: await inhabitant.generateEntriesFor(request.body.id, allowedKeys)});
    }
});

endpoint("/admin/all-users", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        result.send({success: true, data: await db.getAllUsers()});
    }
});

endpoint("/admin/user", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        result.send({success: true, data: await db.getUserRole(request.body.userId)});
    }
});

endpoint("/admin/user-update-username", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, duplicate: false, reserved: false});
    } else {
        if(!validation.check(request.body.newName, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC).success ||
           !validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, duplicate: false, reserved: false});
            return;
        }
        if(request.body.newName == properties.get("Admin.username", null)) {
            result.send({success: false, duplicate: false, reserved: true});
            return;
        }
        let oldUser = await db.getUserByUsername(request.body.newName);
        if(oldUser != null) {
            result.send({success: false, duplicate: true, reserved: false});
            return;
        }
        await db.updateUserUsername(request.body.userId, request.body.newName);
        result.send({success: true, data: await db.getUser(request.body.userId)});
    }
});

endpoint("/admin/user-update-role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, unauthorized: false});
            return;
        }
        result.send({success: true, data: await db.updateUserRole(request.body.userId, request.body.roleId)});
    }
});

endpoint("/admin/user", "PUT", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, duplicate: false});
    } else {
        if(!validation.check(request.body.username, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC).success) {
            result.send({success: false});
            return;
        }
        let existingUser = await db.getUserByUsername(request.body.username);
        if(existingUser != null) {
            result.send({success: false, duplicate: true, id: existingUser.id});
            return;
        }
        try {
            await db.createUser(request.body.username, (await db.getDefaultRole())!.id);
            let newUser = await db.getUserByUsername(request.body.username);
            result.send({success: true, user: newUser});
        } catch(e) {
            result.send({success: false, duplicate: false});
        }
    }
});

endpoint("/admin/user", "DELETE", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        db.deleteUser(request.body.userId);
        result.send({success: true});
    }
});

endpoint("/admin/all-roles", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        result.send({success: true, data: await db.getAllRoles()});
    }
});

endpoint("/admin/role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

endpoint("/admin/role", "PUT", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.rolename, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC_WITH_SPACES).success ||
           !validation.check(request.body.parentId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        await db.createRole(request.body.rolename, {}, request.body.parentId ?? null);
        let createdRole = await db.getLastCreatedRole();
        result.send({success: true, role: createdRole});
    }
});

endpoint("/admin/role-update-name", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.newName, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC_WITH_SPACES).success) {
            result.send({success: false});
            return;
        }
        await db.updateRoleName(request.body.roleId, request.body.newName);
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

endpoint("/admin/users-by-role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        result.send({success: true, data: await db.getAllUsersWithRole(request.body.roleId)});
    }
});

endpoint("/admin/role-update-admin", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.isAdmin, validation.Flags.NOT_NULL | validation.Flags.IS_BOOLEAN).success) {
            result.send({success: false});
            return;
        }
        await db.setAdminRole(request.body.roleId, request.body.isAdmin);
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

endpoint("/admin/role-get-default", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        result.send({success: true, data: await db.getDefaultRole()});
    }
});


endpoint("/admin/role-set-default", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, missing: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, missing: false});
            return;
        }
        let roleNotFound = await db.setDefaultRole(request.body.roleId);
        if(!roleNotFound) {
            result.send({success: true, data: await db.getDefaultRole()});
        } else {
            result.send({success: false, missing: true});
        }
    }
});

endpoint("/admin/permission-entries", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        result.send({success: true, data: Array.from(inhabitant.getPermissionEntries())});
    }
});

endpoint("/admin/get-role-effective-permissions", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        let role = await db.getRole(request.body.roleId);
        if(role == null) {
            result.send({success: true, data: []});
        } else {
            let effectivePermissions = await permissions.getEffectivePermissions(role);
            result.send({success: true, data: effectivePermissions});
        }
    }
});

endpoint("/admin/role-update-permissions", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.permissions, validation.Flags.NOT_NULL | validation.Flags.IS_OBJECT | validation.Flags.PERMISSION_FORMAT_COMPLIANT).success) {
            result.send({success: false});
            return;
        }
        await db.updateRolePermissions(request.body.roleId, request.body.permissions);
        result.send({success: true});
    }
});

endpoint("/admin/role-update-parent", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, cyclic: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.parentId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false, cyclic: false});
            return;
        }
        let successWithoutCycles = await db.updateRoleParent(request.body.roleId, request.body.parentId);
        if(successWithoutCycles) {
            result.send({success: true});
        } else {
            result.send({success: false, cyclic: true});
        }
    }
});

endpoint("/admin/role", "DELETE", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.replaceWithRoleId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false});
            return;
        }
        let parentPermissionsPromises :Promise<void>[] = [];
        for (let role of await db.getAllChildrenOfRole(request.body.roleId)) {
            parentPermissionsPromises.push(permissions.dissolveParentPermissions(role));
        }
        await Promise.all(parentPermissionsPromises);
        await db.dissolveRoleParent(request.body.roleId);
        await db.deleteRole(request.body.roleId, request.body.replaceWithRoleId);
        result.send({success: true});
    }
});

async function endpoint(uri :string, rest :RequestMethod, callback :(request :any, result :any) => any) {
    await utils.passportReady();
    switch(rest) {
        case "GET":
            APP.get(uri, callback);
            break;
        case "PUT":
            APP.put(uri, callback);
            break;
        case "POST":
            APP.post(uri, callback);
            break;
        case "DELETE":
            APP.delete(uri, callback);
            break;
    }
}