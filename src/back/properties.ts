import fs from "fs";
import path from "path";
import process from "process";
import PropertiesReader from "properties-reader";

const PATH = [process.cwd(), process.argv[1]];
let properties :PropertiesReader.Reader;


export function initProperties() {
    let profile = retrieveProfileName();
    if(profile == null) {
        console.error(
            `Es necesario facilitar un perfil para propiedades (-p {perfil}) que corresponda con un archivo .ini ubicado en el directorio del ejecutable.`
        );
        process.exit();
    }

    let profileFilename = profile.endsWith(".ini") ? profile : `${profile}.ini`;
    console.log(`Iniciando el programa con la configuración ${profileFilename}...`);
    let success = false;
    for(let directory of PATH) {
        try {
            let file = path.join(directory, profileFilename);
            fs.accessSync(file, fs.constants.F_OK); // Throws error if file not in directory
            success = true;
            properties = PropertiesReader(file);
            break;
        } catch(e) { // Take the error as sign of checking next directory
            continue;
        }
    }
    if(!success) {
        console.error(
            `No se ha encontrado ningún archivo de propiedades para el perfil "${profile}" (${profileFilename}) en el directorio. Imposible continuar.`
        );
        process.exit();
    }
}


export function get<T extends PropertiesReader.Value | null>(key :string, defaultValue? :T) {
    let ret = properties.get(key) as T | null;
    if(ret == null) {
        if(defaultValue !== undefined) {
            return defaultValue;
        } else {
            let split = key.split(".");
            let display = split.length <= 1 ? split[0] : `[${split[0]}] ${split.slice(1).join(".")}`;
            throw new Error(`La propiedad ${display} no se ha encontrado o no tiene ningún valor. Asegúrese de que coinciden mayúsculas y minúsculas.`);
        }
    }
    return ret;
}


export function getOrElse<T extends PropertiesReader.Value | null>(...keys :string[]) :T {
    if(keys.length == 0) {
        throw new Error('No se ha especificiado ninguna clave');
    } else if(keys.length == 1) {
        return get(keys.shift()!); // Do not catch the error if this is the last key
    } else {
        try {
            return get(keys.shift()!); // If key is not found, an error will be caught
        } catch(e) {
            return getOrElse<T>(...keys); // If an error is caught, try with the remaining keys
        }
    }
    
}


export function* all() {
    for(let [property_key, property_value] of Object.entries(properties.getAllProperties())) {
        yield {
            key: property_key,
            value:  property_value
        }
    }
}


function retrieveProfileName() {
    let possibleHeaders = ["-p", "--profile"];
    let profileName :string | null = null;
    for(let possibleHeader of possibleHeaders) {
        let headerPosition = process.argv.indexOf(possibleHeader);
        if(headerPosition == -1 || headerPosition == process.argv.length -1) {   // Header was either not found, or was found at last position with no value
            continue;
        }
        profileName = process.argv[headerPosition + 1];
        break;
    }
    return profileName;
}
