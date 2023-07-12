import * as db from "./db-queries.js";
import * as properties from "./properties.js";
import * as inhabitant from "./inhabitant-data.js";


// Este módulo gestiona y procesa los permisos de los usuarios para ver las entradas de los habitantes.


/** Devuelve los datos del usuario y su rol en base a su nombre de usuario. Si el usuario no estaba registrado y las propiedades lo permiten,
 *  también registra al usuario.
 */
export async function identify(username :string) {
    let result = await db.getUserRoleByUsername(username);
    if(result == null) {
        // El usuario no estaba registrado.
        if(properties.get("LDAP.allow-self-register", false)) {
            await db.createUser(username, (await getDefaultRole()).id);
            result = await db.getUserRoleByUsername(username);
        } else {
            throw new Error("La configuración del servidor no permite usuarios auto-registrados.");
        }
    }
    return result!;
}


/** Identifica y devuelve los datos del usuario correspondiente al administrador auxiliar. Si el nombre proporcionado no coincide con el nombre que tiene
 *  en la base de datos, se actualizará su nombre al indicado.
 */
export async function findAuxAdmin(adminUsername :string = "admin") {
    let result = await db.getAuxAdmin();
    if(result == null) {
        try {
            // No había cuenta de admin auxiliar, la creamos.
            await db.createUser(adminUsername, (await getDefaultRole()).id);
            result = await db.getUserByUsername(adminUsername);
            db.setAuxiliar(result!.id);
        } catch(e) {
            // No había cuenta de admin auxiliar y no hemos podido crearla.
            console.error(`No se ha podido crear cuenta auxiliar para el administrador. Causa: ${e}`);
            return {success: false as const, failedRename: false};
        }
    } else if(result.username != adminUsername) {
        // El nombre de la cuenta de admin auxiliar no coincide con el actual. Lo actuaizamos.
        let { success } = await db.updateUserUsername(result.id, adminUsername);
        if(!success) {
            // Ya había otro usuario con ese nombre.
            console.error(`Se ha intentado renombrar la cuenta ${result.username} a "${adminUsername}" y no se ha podido.`);
            return {success: false as const, failedRename: true};
        }
    }
    return {success: true as const, data: result!};
}


/** Aplana la jerarquía de permisos un nivel. Este método se usará de cara a los casos en los que tenemos una cadena de roles A → B → C y C hereda algunos
 *  permisos de B que son distintos de A. Cuando aplanemos la cadena para tener A → C, queremos mover a C algunos de los permisos explícitos de B que difieren
 *  de los de A, de manera que la experiencia de los usuarios se vea lo menos alterada posible.
 */
export async function dissolveParentPermissions(role :Role) {
    let newPermissions :RolePermissions = {}
    let parentRole = role.parent ? await db.getRole(role.parent) : null;
    let grandparentRole = parentRole != null && parentRole.parent != null ? await db.getRole(parentRole.parent) : null;

    if(grandparentRole == null) {
        // Si el rol base no tenía su propio rol base, el rol actual tampoco tendrá rol base. Sus nuevos permisos no se heredarán de nada.
        newPermissions = await getEffectivePermissions(role);
    } else {
        // En caso contrario, comparamos los permisos del rol actual y del rol base base.
        let currentPermissions = role.entries;
        let [ currentEffectivePermissions, grandparentPermissions ] = await Promise.all([
            await getEffectivePermissions(role),
            await getEffectivePermissions(grandparentRole)
        ]);
        for(let permission in currentPermissions) {
            if(currentPermissions[permission] != null) {
                // El rol actual ya define un permiso para esta entrada.
                newPermissions[permission] = currentPermissions[permission]; // Mantenemos el permiso que define este rol.
            } else if(currentEffectivePermissions[permission] != grandparentPermissions[permission]) {
                // El rol actual está recibiendo un permiso distinto al del rol base base para esta entrada.
                newPermissions[permission] = currentEffectivePermissions[permission]; // Desactivamos la herencia y ponemos el permiso que recibía este rol.
            } else {
                // El rol actual está recibiendo el mismo permiso que el rol base base para esta entrada.
                newPermissions[permission] = null; // Mantenemos la herencia.
            }
        }
    }

    // Guardamos los permisos en la base de datos.
    db.updateRolePermissions(role.id, newPermissions);
}


/** Devuelve los permisos que tiene el rol indicado para todas las entradas o, si se especifica, para las entradas incluidas en `pendingKeys`. */
export async function getEffectivePermissions(role :Role, pendingKeys? :Set<string>) {
    if(pendingKeys == null) {
        // Si no hemos recibido pendingKeys, cogemos todas las entradas disponibles para el habitante.
        pendingKeys = new Set(Array.from(inhabitant.getPermissionEntries()).map(e => e.permissionKey));
    }

    let currentPermissions = role.entries;
    let ret :EffectiveRolePermissions = {};

    // Recorreremos todas las entradas que define el rol. Las que encontremos las sacamos de pendingKeys, pero las que no (o sean null) las conservaremos
    // en pendingKeys para buscarlas en el rol base.
    for(let key in currentPermissions) {
        if(pendingKeys.has(key) && currentPermissions[key] != null) {
            ret[key] = currentPermissions[key] as boolean;
            pendingKeys.delete(key);
        }
    }

    // Si todavía nos quedan permisos sin resolver, miraremos si hay un rol base donde seguir mirando permisos que se hereden.
    if(pendingKeys.size != 0) {
        let parentRole = role.parent != null ? await db.getRole(role.parent) : null;
        if(parentRole != null) {
            // Si hay rol base, repetiremos el proceso sobre el mismo pero solo buscando los permisos que faltan.
            let parentPermissions = await getEffectivePermissions(parentRole, pendingKeys);
            for(let key in parentPermissions) {
                ret[key] = parentPermissions[key];
            }
        } else {
            // Si no hay rol base, asumimos que todas las entradas que quedan son innaccesibles y listo.
            for(let key of pendingKeys) {
                ret[key] = false;
            }
        }
    }
    return ret;
}


/** Devuelve el rol marcado como predeterminado. */
export async function getDefaultRole() {
    let role = await db.getDefaultRole();
    if(role == null) {
        await db.createRole("Predeterminado", {is_registered: true});
        role = await db.getDefaultRole();
    }
    return role!;
}                                       