import fs from "fs";
import path from "path";
import process from "process";
import PropertiesReader from "properties-reader";

// Este módulo facilita la lectura de propiedades del perfil que el servidor está usando.

/** Indica los directorios donde se buscarán los archivos de perfiles. Si no se encuentra en uno, se buscará en el siguiente. El primero es el directorio
 * raíz del proyecto, el segundo es el directorio del módulo main.js.
 */
const PATH = [process.cwd(), process.argv[1]];
let properties :PropertiesReader.Reader;

/** Carga en memoria las propiedades del perfil. Debe ejecutarse antes de poder consultar las propiedades. */
export function initProperties() {
    let profile = retrieveProfileName();
    if(profile == null) {
        // Al ejecutarse el programa, no se ha indicado el nombre del perfil como parámetro.
        console.error(
            `Es necesario facilitar un perfil para propiedades (-p {perfil}) que corresponda con un archivo .ini ubicado en el directorio del ejecutable.`
        );
        process.exit();
    }

    // Los archivos de propiedades tienen la extensión ini. Si el parámetro la omite, la podemos dar por hecho.
    let profileFilename = profile.endsWith(".ini") ? profile : `${profile}.ini`;
    console.log(`Iniciando el programa con la configuración ${profileFilename}...`);
    let success = false;
    for(let directory of PATH) {
        try {
            let file = path.join(directory, profileFilename);
            fs.accessSync(file, fs.constants.F_OK); // Lanza un error si el archivo no se encuentra en este directorio.
            success = true;
            properties = PropertiesReader(file);
            break;
        } catch(e) { // El error significa que debemos mirar el siguiente directorio.
            continue;
        }
    }
    if(!success) {
        // Mirando en todos los directorios, no se ha encontrado el perfil indicado en ninguno.
        console.error(
            `No se ha encontrado ningún archivo de propiedades para el perfil "${profile}" (${profileFilename}) en el directorio. Imposible continuar.`
        );
        process.exit();
    }
}


/** Obtiene el valor de una propiedad. Si esa propiedad no se ha definido, devolverá `defaultValue` en su lugar. Si además no se
 *  proporciona `defaultValue`, lanzará un error. Antes de usarse, se debe ejecutar `properties.initProperties()`.
 */
export function get<T extends PropertiesReader.Value | null>(key :string, defaultValue? :T) {
    let ret = properties.get(key) as T | null;
    if(ret == null) {
        if(defaultValue !== undefined) { // Si defaultValue es estrictamente undefined, no se ha proporcionado (es distinto de null).
            return defaultValue;
        } else {
            // No se ha encontrado el valor ni se ha proporcionado un defaultValue.
            let split = key.split(".");
            let display = split.length <= 1 ? split[0] : `[${split[0]}] ${split.slice(1).join(".")}`;
            throw new Error(`La propiedad ${display} no se ha encontrado o no tiene ningún valor. Asegúrese de que coinciden mayúsculas y minúsculas.`);
        }
    }
    return ret;
}


/** Consulta una o varias propiedades secuencialmente. Si una propiedad no está definida, se consultará la siguiente. Si ninguna de ellas está definida, 
 *  esta función lanzará un error. Antes de usarse, se debe ejecutar `properties.initProperties()`.
*/
export function getOrElse<T extends PropertiesReader.Value | null>(...keys :string[]) :T {
    if(keys.length == 0) {
        // La lista de propiedades está vacía.
        throw new Error('No se ha especificiado ninguna clave que tenga valor.');
    } else if(keys.length == 1) {
        // Última clave. No capturamos el error si lo hay.
        return get(keys.shift()!);
    } else {
        try {
            // Si no se encuentra la primera propiedad, la quitamos de la lista y lanzamos un error.
            return get(keys.shift()!);
        } catch(e) {
            // Repetimos el proceso, pero la que antes era la segunda propiedad ahora es la primera.
            return getOrElse<T>(...keys);
        }
    }
    
}


/** Itera por todas las propiedades cargadas del perfil actual. Antes de usarse, se debe ejecutar `properties.initProperties()`. */
export function* all() {
    for(let [property_key, property_value] of Object.entries(properties.getAllProperties())) {
        yield {
            key: property_key,
            value:  property_value
        }
    }
}


/** Devuelve el nombre del perfil tal y como ha recibido el programa como parámetro. */
function retrieveProfileName() {
    let possibleHeaders = ["-p", "--profile"]; // Se permite cualquiera de las dos opciones.
    let profileName :string | null = null;
    for(let possibleHeader of possibleHeaders) {
        let headerPosition = process.argv.indexOf(possibleHeader);
        if(headerPosition == -1 || headerPosition == process.argv.length -1) {   // No se ha encontrado ninguno de los encabezados, o el
                                                                                 // que se ha encontrado no tenía nada detrás.
            continue;
        }
        profileName = process.argv[headerPosition + 1]; // Si se ha encontrado un encabezado con valor detrás, miramos y devolvemos dicho valor.
        break;
    }
    return profileName;
}
