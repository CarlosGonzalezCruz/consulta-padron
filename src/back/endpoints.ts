import fs from "fs";
import https from "https";
import express from "express";
import * as inhabitant from "./inhabitant-data.js"
import * as properties from "./properties.js";
import * as permissions from "./permissions.js";
import * as db from "./db-queries.js";
import * as login from "./login.js";
import * as validation from "./validation.js";
import * as document from "./generate-document.js";
import * as utils from "./utils.js";


// Este módulo define la interfaz REST que usará el cliente web.

const APP = express(); 

export async function listen() {
    login.setup(APP); // Activamos el servidor de credenciales.
    let httpsPort = properties.get<number>("Application.https-port");
    let httpPort = properties.get<number | null>("Application.http-port", null);
    https.createServer({ // Empezamos a escuchar peticiones REST.
        key: fs.readFileSync(properties.get<string>("Application.ssl-key")),
        cert: fs.readFileSync(properties.get<string>("Application.ssl-cert")),
        passphrase: properties.get<string>("Application.ssl-passphrase")
    }, APP).listen(httpsPort, () => {
        console.log(`(https) Atendiendo al puerto ${httpsPort}...`);
        if(httpPort != null) {
            setupHttpToHttpsRedirect(httpPort, httpsPort);
        }
    });
}

// Aquí se puede añadir funcionalidad que se ejecutará justo antes de cerrar el programa.
process.on("SIGINT", async () => {
    console.log("Hasta luego");
    process.exit();
});

/** Crea un servidor HTTP que redirigirá todas las peticiones REST al servidor HTTPS. Permite a los usuarios acceder al
 *  cliente web sin tener que escribir https:// manualmente.
 */
function setupHttpToHttpsRedirect(httpPort :number, httpsPort :number) {
    let httpApp = express();
    let targetHost = (req :any) => req.headers.host.replace(/(\w*):(\d{1,5})/, `$1:${httpsPort}`); // Aquí simplemente reemplazamos el puerto HTTP por el HTTPS en el host.
    httpApp.get("*", (req, res) => res.redirect(`https://${targetHost(req)}${req.url}`)); // Redirigimos todas las peticiones al host HTTPS con la dirección introducida.
    httpApp.listen(httpPort);
    console.log(`(http) Atendiendo al puerto ${httpPort}...`);
}

// Los recursos de web (HTML y CSS) y out/front (Javascript) se ofrecerán estáticamente al front-end.
APP.use(express.static("web"));
APP.use(express.static("out/front"));
// La comunicación se hará mediante archivos JSON, por lo que necesitamos poder codificarlos y descodificarlos.
APP.use(express.json());
APP.use(express.urlencoded({extended: true}));

// La raíz del cliente web redirigirá a la pantalla de inicio de sesión.
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

// En entornos ajenos a producción, se presentará en el cliente el nombre del entorno. Por ello, debe ser accesible mediante un endpoint.
endpoint('/environment-label', "GET", (request, result) => {
    result.send(properties.get("Application.environment-label", ""));
});

endpoint("/login", "POST", (request, result) => {
    login.tryLogin(request, result);
});

endpoint("/logout", "POST", (request, result) => {
    login.tryLogout(request, result);
});

// Endpoint donde el cliente web puede comprobar si su token de sesión, que no se puede descodificar fuera del servidor, corresponde a un administrador.
endpoint("/am-i-admin", "POST", (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success) {
        result.send({admin: false});
    } else {
        result.send({admin: data.data.isAdmin});
    }
})

// A partir de aquí definimos todos los endpoints. Para todos los endpoints seguiremos esta estructura:
// * endpoint("/api-rest-endpoint", "POST" | "PUT" | "DELETE" según el método que queramos, () => {
// * * login.getSessionData(request), para comprobar que el usuario tiene una sesión válida que no ha expirado.
// * * if(!data.success), en caso de que la sesión NO sea válida.
// * * * result.send({success: false, expired: data.expired}), indicando al cliente que no se ha podido realizar la petición. Si la razón es que la sesión
// * * *                                                       ha expirado, se puede facilitar el campo expired al cliente para que lo muestre al usuario.
// * * else
// * * * if(!validation.check(request.body.fields, flags)), de manera que nos aseguramos de que los datos recibidos sean válidos. El cliente siempre
// * * *                                                    enviará datos válidos, pero no podemos omitir la posibilidad de que una aplicación no autorizada se conecte
// * * *                                                    a los endpoints y haga un uso fraudulento de la API p.ej mediante un ataque XSS.
// * * * * result.send({success: false}), indicando que no se puede realizar la operación si los datos no son válidos. El emisor de los datos no necesita saber que
// * * * *                                este es el motivo concreto por el que no se puede.
// * * * else
// * * * * Procesamiento general de la operación
// * * * * result.send({success: true, data: data}), indicando que la operación se ha realizado con éxito y se procede a enviar los datos en respuesta.
// * })

// Devuelve todos los datos sobre un habitante que el usuario pueda consultar.
endpoint("/inhabitant-data-id", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success) {
        result.send({success: false, expired: data.expired, unauthorized: false});
    } else {
        if(!validation.check(request.body.id, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, unauthorized: false});
            return;
        }
        // Obtenemos todos los campos que este usuario puede consultar.
        let userRole = await permissions.identify(data.data.username || data.data.user);
        let effectivePermissions = await permissions.getEffectivePermissions(userRole);
        let allowedKeys = Object.entries(effectivePermissions).filter(e => e[1]).map(e => e[0]);
        // Sabiendo los campos permitidos, obtenemos los datos sobre dichos campos para el habitante requerido.
        result.send({success: true, data: await inhabitant.generateEntriesFor(request.body.id, allowedKeys)});
    }
});

// Envía al cliente un PDF con los datos del habitante. Dado que este endpoint envía un BLOB, no podemos cambiar el tamaño del cuerpo
// fácilmente, por lo que utilizaremos el encabezado para indicar si el documento se ha generado con éxito (200) o no (400).
endpoint("/inhabitant-data-document", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success) {
        result.writeHead(400).end();
    } else {
        if(!validation.check(request.body.id, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success
        || !validation.check(request.body.displayId, validation.Flags.IS_ALPHANUMERIC).success) {
            result.writeHead(400).end();
            return;
        }
        let userRole = await permissions.identify(data.data.username || data.data.user);
        let effectivePermissions = await permissions.getEffectivePermissions(userRole);
        let allowedKeys = Object.entries(effectivePermissions).filter(e => e[1]).map(e => e[0]);
        try {
            let docData = await document.generateDocumentForInhabitant(request.body.id, allowedKeys, request.body.displayId);
            result.writeHead(200, {
                "Content-Length": Buffer.byteLength(docData),
                "Content-Type": "application/pdf",
                "Content-disposition": `attachment;filename=padron-${request.body.displayId}.pdf`
            }).end(docData);
        } catch(e) {
            result.writeHead(400).end();
        }
    }
});

// Devuelve una lista con el id y el nombre de todos los usuarios.
endpoint("/admin/all-users", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        result.send({success: true, data: await db.getAllUsers()});
    }
});

// Devuelve los datos del usuario requerido y su rol.
endpoint("/admin/user", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        result.send({success: true, data: await db.getUserRole(request.body.userId)});
    }
});

// Cambia el nombre del usuario requerido por el nombre indicado.
endpoint("/admin/user-update-username", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false, duplicate: false, reserved: false});
    } else {
        if(!validation.check(request.body.newName, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC | validation.Flags.IS_NON_EMPTY_STRING).success ||
           !validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, duplicate: false, reserved: false});
            return;
        }
        if(request.body.newName == properties.get("Admin.username", null)) {
            result.send({success: false, expired: false, duplicate: false, reserved: true});
            return;
        }
        // Los nombres son únicos. Si ya hay un usuario con este nombre, la operación fallará.
        let oldUser = await db.getUserByUsername(request.body.newName);
        if(oldUser != null) {
            result.send({success: false, expired: false, duplicate: true, reserved: false});
            return;
        }
        await db.updateUserUsername(request.body.userId, request.body.newName);
        result.send({success: true, data: await db.getUser(request.body.userId)});
    }
});

// Cambia el rol del usuario requerido al rol indicado.
endpoint("/admin/user-update-role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        result.send({success: true, data: await db.updateUserRole(request.body.userId, request.body.roleId)});
    }
});


// Crea un usuario nuevo con el nombre indicado.
endpoint("/admin/user", "PUT", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false, duplicate: false});
    } else {
        if(!validation.check(request.body.username, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC | validation.Flags.IS_NON_EMPTY_STRING).success) {
            result.send({success: false, expired: false, duplicate: false});
            return;
        }
        // El nombre no puede estar duplicado.
        let existingUser = await db.getUserByUsername(request.body.username);
        if(existingUser != null) {
            result.send({success: false, expired: false, duplicate: true, id: existingUser.id});
            return;
        }
        try {
            await db.createUser(request.body.username, (await db.getDefaultRole())!.id);
            let newUser = await db.getUserByUsername(request.body.username);
            result.send({success: true, user: newUser});
        } catch(e) {
            result.send({success: false, expired: false, duplicate: false});
        }
    }
});

// Borra el usuario indicado de la base de datos.
endpoint("/admin/user", "DELETE", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.userId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        db.deleteUser(request.body.userId);
        result.send({success: true});
    }
});

// Devuelve una lista con el id y el nombre de todos los roles.
endpoint("/admin/all-roles", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        result.send({success: true, data: await db.getAllRoles()});
    }
});

// Devuelve el rol con el id indicado.
endpoint("/admin/role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

// Crea un rol con los datos indicados.
endpoint("/admin/role", "PUT", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.rolename, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC_WITH_SPACES | validation.Flags.IS_NON_EMPTY_STRING).success ||
           !validation.check(request.body.parentId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        await db.createRole(request.body.rolename, {}, request.body.parentId ?? null);
        let createdRole = await db.getLastCreatedRole();
        result.send({success: true, role: createdRole});
    }
});

// Cambia el nombre del rol requerido por el nombre indicado.
endpoint("/admin/role-update-name", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.newName, validation.Flags.NOT_NULL | validation.Flags.IS_ALPHANUMERIC_WITH_SPACES | validation.Flags.IS_NON_EMPTY_STRING).success) {
            result.send({success: false, expired: false});
            return;
        }
        await db.updateRoleName(request.body.roleId, request.body.newName);
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

// Devuelve una lista con el id y el nombre de todos los usuarios que tengan el rol indicado.
endpoint("/admin/users-by-role", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        result.send({success: true, data: await db.getAllUsersWithRole(request.body.roleId)});
    }
});

// Cambia el estatus de admin del rol indicado.
endpoint("/admin/role-update-admin", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.isAdmin, validation.Flags.NOT_NULL | validation.Flags.IS_BOOLEAN).success) {
            result.send({success: false, expired: false});
            return;
        }
        await db.setAdminRole(request.body.roleId, request.body.isAdmin);
        result.send({success: true, data: await db.getRole(request.body.roleId)});
    }
});

// Devuelve el rol configurado como predeterminado.
endpoint("/admin/role-get-default", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        result.send({success: true, data: await db.getDefaultRole()});
    }
});


// Marca el rol indicado como predeterminado, si existe. Si no existe, no tiene efecto.
endpoint("/admin/role-set-default", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false, missing: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, missing: false});
            return;
        }
        // Por diseño, siempre debe haber un rol predeterminado. Eso significa que el rol que ya es actualmente el predeterminado dejará de serlo, pero también
        // significa que si el nuevo rol predeterminado no existe, no tendremos rol predeterminado. Por lo tanto, esta función no hará nada si no existe el nuevo rol.
        let roleNotFound = await db.setDefaultRole(request.body.roleId);
        if(!roleNotFound) {
            result.send({success: true, data: await db.getDefaultRole()});
        } else {
            result.send({success: false, missing: true});
        }
    }
});

// Obtiene una lista estática de todos los posibles campos que se pueden consultar sobre un habitante.
endpoint("/admin/permission-entries", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        result.send({success: true, data: Array.from(inhabitant.getPermissionEntries())});
    }
});

// Devuelve las entradas que puede consultar el rol indicado, teniendo en cuenta los permisos heredados del rol base.
endpoint("/admin/get-role-effective-permissions", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
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

// Cambia los permisos del rol indicado.
endpoint("/admin/role-update-permissions", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.permissions, validation.Flags.NOT_NULL | validation.Flags.IS_OBJECT | validation.Flags.PERMISSION_FORMAT_COMPLIANT).success) {
            result.send({success: false, expired: false});
            return;
        }
        await db.updateRolePermissions(request.body.roleId, request.body.permissions);
        result.send({success: true});
    }
});

// Cambia el rol base del rol indicado.
endpoint("/admin/role-update-parent", "POST", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false, cyclic: false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.parentId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false, cyclic: false});
            return;
        }
        // Es posible que el usuario esté formando una cadena circular de roles base. En este caso, no se puede completar la operación.
        let successWithoutCycles = await db.updateRoleParent(request.body.roleId, request.body.parentId);
        if(successWithoutCycles) {
            result.send({success: true});
        } else {
            result.send({success: false, expired: false, cyclic: true});
        }
    }
});

// Borra el rol indicado y pasa a otro rol todos los usuarios que lo tuvieran.
endpoint("/admin/role", "DELETE", async (request, result) => {
    let data = login.getSessionData(request);
    if(!data.success || !data.data.isAdmin) {
        result.send({success: false, expired: !data.success ? data.expired : false});
    } else {
        if(!validation.check(request.body.roleId, validation.Flags.NOT_NULL | validation.Flags.IS_NUMBER).success ||
           !validation.check(request.body.replaceWithRoleId, validation.Flags.IS_NUMBER).success) {
            result.send({success: false, expired: false});
            return;
        }
        // Aquí colapsamos la jerarquía para no dejar huérfanos a los roles derivados del que vamos a borrar. Si vamos a borrar B en la cadena A → B → C, queremos que
        // la cadena quede como A → C. En este proceso, para intentar modificar los permisos lo menos posible, se actualizarán los permisos de los roles derivados para
        // conservar los permisos efectivos que antes dependieran de heredar de B.
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

/** Esta función activa los endpoints indicados después de que Passport pueda activarse. */
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