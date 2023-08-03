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

const WANTED_LDAP_ACCOUNTS = 10;


export async function generateLDAPAccounts() {
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