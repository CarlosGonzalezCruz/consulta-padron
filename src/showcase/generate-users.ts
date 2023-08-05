import * as db from "../back/db-queries.js";

const LAST_NAMES = [
    'García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
    'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Alonso', 'Gutiérrez',
    'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Ramírez', 'Molina',
    'Suárez', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Nuñez', 'Medina',
    'Garrido', 'Cortés', 'Castillo', 'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez', 'Cruz',
    'Calvo', 'Gallego', 'Vidal', 'León', 'Márquez', 'Herrera', 'Peña', 'Flores', 'Cabrera', 'Campos', 'Vega',
    'Fuentes', 'Carrasco', 'Diez', 'Reyes', 'Caballero', 'Nieto', 'Aguilar', 'Santiago', 'Pascual', 'Sáez',
    'Esteban', 'Parra', 'Bravo', 'Rivas', 'Mora', 'Solís', 'Maldonado', 'Soto', 'Vargas', 'Moya', 'Valero',
    'Rojas', 'Bernal', 'Crespo', 'Arias', 'Cervantes', 'Pardo', 'Estévez', 'Munuera', 'Mora', 'Salas',
    'Lara', 'Soria', 'Montes', 'Hidalgo', 'Villar', 'Sáez', 'Carrillo', 'Valle', 'Santana', 'Castaño'
] as const;

const PASSWORDS = [
    "123456", "password", "123456789", "12345678", "12345", "1234567", "1234567",
    "qwerty", "abc123", "111111", "admin", "letmein", "welcome", "monkey", "password1",
    "1234", "sunshine", "superman", "iloveyou", "starwars", "football", "baseball",
    "password123", "qwertyuiop", "123123", "dragon", "1234567890", "123456789", "qwerty123"
];

const ROLE_NAMES = [
    "Secretaría", "Jefe de Personal", "Recursos Humanos", "Administración General", "Hacienda", "Urbanismo", "Cultura", "Deportes", "Medio Ambiente", "Servicios Sociales", "Policía"
];

const WANTED_LDAP_ACCOUNTS = 10;


export async function generateAccountData() {
    await generateLDAPAccounts();
    await generateRoles();
    await generateUserAccounts();
}


async function generateLDAPAccounts() {
    let desiredInhabitants = WANTED_LDAP_ACCOUNTS - await db.getAmountOfLDAPAccounts();
    if(desiredInhabitants <= 0) {
        return;
    }
    console.log(`Se van a generar ${WANTED_LDAP_ACCOUNTS} cuentas de LDAP.`);

    for(let i = WANTED_LDAP_ACCOUNTS - desiredInhabitants; i < WANTED_LDAP_ACCOUNTS; i++) {
        if(typeof process.stdout.cursorTo == "function") {
            process.stdout.write(`Generando habitantes de muestra... ${(i+1).toString().padStart(3, ' ')}/${WANTED_LDAP_ACCOUNTS}`);
            process.stdout.cursorTo(0);
        }

        await db.inserUserLDAPAccount(getRandomUsername(), pickRandom(PASSWORDS));
    }

    console.log(`Cuentas ficticias de LDAP creadas.`);
}


async function generateUserAccounts() {
    let roles = await db.getAllRoles();
    for(let ldapUser of await db.getAllLDAPAccounts()) {
        let existingUser = await db.getUserByUsername(ldapUser.USERNAME);
        if(!existingUser) {
            await db.createUser(ldapUser.USERNAME, pickRandom(roles).id);
        }
    }
}


async function generateRoles() {
    let existingRoles = await db.getAllRoles();
    let desiredRoles = ROLE_NAMES.length - existingRoles.length;
    if(desiredRoles <= 0) {
        return;
    }
    console.log(`Se van a generar ${ROLE_NAMES.length} roles.`);

    for(let i = ROLE_NAMES.length - desiredRoles; i < ROLE_NAMES.length; i++) {
        if(typeof process.stdout.cursorTo == "function") {
            process.stdout.write(`Generando roles... ${(i+1).toString().padStart(3, ' ')}/${ROLE_NAMES}`);
            process.stdout.cursorTo(0);
        }

        let name = pickRandom(ROLE_NAMES.filter(n => !existingRoles.map(r => r.name).contains(n)));
        let permissions :RolePermissions = {"is_registered": true};
        if(Math.random() < 0.7) {
            permissions["full_name"] = true;
            permissions["birth_date"] = true;
            permissions["gender"] = true;
        }
        if(Math.random() < 0.7) {
            permissions["registration_date"] = true;
            permissions["last_move_date"] = true;
            permissions["last_move_description"] = true;
        }
        if(Math.random() < 0.7) {
            permissions["is_protected"] = true;
            permissions["is_paralyzed"] = true;
        }
        if(Math.random() < 0.5) {
            permissions["instruction_level"] = true;
        }
        if(Math.random() < 0.5) {
            permissions["landline_phone"] = true;
            permissions["mobile_phone"] = true;
            permissions["fax_number"] = true;
            permissions["email"] = true;
        }
        if(Math.random() < 0.5) {
            permissions["father_name"] = true;
            permissions["mother_name"] = true;
        }
        if(Math.random() < 0.5) {
            permissions["phonetic_name"] = true;
            permissions["latinized_name"] = true;
            permissions["latinized_surname_1"] = true;
            permissions["latinized_surname_2"] = true;
        }
        if(Math.random() < 0.7) {
            permissions["address"] = true;
            permissions["postal_code"] = true;
            permissions["municipality"] = true;
        }
        await db.createRole(name, permissions);
        existingRoles.push({id: -1, name});
    }

    console.log(`Roles creados.`);
}


function getRandomUsername() {
    let letters = 'abcdefghijklmnopqrstuvwxyz';
    let randomLetter = letters[Math.floor(Math.random() * letters.length)];
    let randomLastName = removeDiacritics(LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]).toLowerCase();
    return randomLetter + randomLastName;
}


function removeDiacritics(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  

function pickRandom<T>(array: readonly T[]): T {
    let randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}