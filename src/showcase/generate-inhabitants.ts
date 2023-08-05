import process from "process";
import * as db from "../back/db-queries.js";

const MEN_NAMES = [
    'Antonio', 'Manuel', 'Francisco', 'Juan', 'David', 'José', 'Javier', 'Daniel', 'Miguel', 'Ángel',
    'Pedro', 'Carlos', 'Rafael', 'Luis', 'Jesús', 'Alejandro', 'Fernando', 'Pablo', 'Sergio', 'Jorge',
    'Diego', 'Alberto', 'Adrián', 'Rubén', 'Enrique', 'Víctor', 'Mario', 'Ignacio', 'Gonzalo', 'Iván',
    'Andrés', 'Óscar', 'Roberto', 'Tomás', 'Salvador', 'Emilio', 'Guillermo', 'Ismael', 'Eduardo',
    'Juan Carlos', 'Joaquín', 'Julio', 'Julián', 'Jordi', 'Xavier', 'Santiago', 'Ramón', 'Marcos',
    'Agustín', 'Hugo'
] as const;

const WOMEN_NAMES = [
    'María', 'Carmen', 'Isabel', 'Ana', 'Marta', 'Lucía', 'Laura', 'Sara', 'Elena', 'Pilar',
    'Teresa', 'Rosa', 'Nuria', 'Cristina', 'Silvia', 'Patricia', 'Lorena', 'Raquel', 'Alicia', 'Beatriz',
    'Mónica', 'Lidia', 'Natalia', 'Esther', 'Lourdes', 'Amparo', 'Aurora', 'Celia', 'Clara', 'Concepción',
    'Dolores', 'Elisa', 'Emilia', 'Encarnación', 'Esperanza', 'Fátima', 'Gloria', 'Inmaculada', 'Irene', 'Josefa',
    'Juana', 'Julia', 'Luisa', 'Manuela', 'Marisol', 'Mercedes', 'Montserrat', 'Noelia', 'Olga', 'Paula'
] as const;
  
const ANY_GENDER_NAMES = [
    ...MEN_NAMES, ...WOMEN_NAMES
] as const;

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

const STREET_NAMES = [
    "Cl Mayor", "Av Constitución", "Pº Castellana", "Cl Gran Vía", "Cl Alcalá", "Av España", "Pza Mayor", "Av Mar", "Cl San Juan", "Pº Marítimo",
    "Av Reyes", "Cl Real", "Av Libertad", "Cl Santa María", "Av Paz", "Pº Prado", "Cl San Miguel", "Av Flores", "Cl San Pedro", "Av Ángeles", "Pza España", "Cl San Francisco",
    "Av Sol", "Cl San Antonio", "Pº Victoria", "Av Cruz", "Cl San José", "Av Olivos", "Cl San Sebastián", "Av Fuente", "Cl San Pablo", "Av Pinos", "Pza Constitución",
    "Cl San Juan Bautista", "Av Esperanza", "Cl San Andrés", "Av Rosales", "Cl San Nicolás", "Av Alegría", "Cl San Rafael", "Av Cedros", "Pza Carmen", "Cl San Gabriel",
    "Av Victoria", "Cl San Mateo", "Av Lirios", "Cl San Lorenzo", "Av Amistad", "Cl San Agustín", "Av Naranjos", "Pza Catedral", "Cl San Isidro", "Av Esperanza", "Cl San Esteban",
    "Av Jazmines", "Cl San Cristóbal", "Av Gloria", "Cl San Lucas", "Av Girasoles", "Pza Ayuntamiento", "Cl San Marcos", "Av Felicidad", "Cl San Miguel", "Av Almendros",
    "Cl San Pedro", "Av Juventud", "Cl San Francisco", "Av Pájaros", "Pza Merced", "Cl San José", "Av Paz", "Cl San Andrés", "Av Robles", "Cl San Nicolás", "Av Alegría",
    "Cl San Rafael", "Av Cedros", "Pza Carmen", "Cl San Gabriel", "Av Victoria", "Cl San Mateo", "Av Lirios", "Cl San Lorenzo", "Av Amistad", "Cl San Agustín", "Av Naranjos",
    "Pza Catedral", "Cl San Isidro", "Av Esperanza", "Cl San Esteban", "Av Jazmines", "Cl San Cristóbal", "Av Gloria", "Cl San Lucas", "Av Girasoles", "Pza Ayuntamiento",
    "Cl San Marcos", "Av Felicidad", "Cl San Miguel", "Av Almendros"
] as const;

const INSTRUCTION_LEVELS = ['00', '10', '11', '20', '21', '22', '30', '31', '32', '40', '41', '42', '43', '44', '45', '46', '47', '48', '99'] as const;

const MOV_SIGN_ON = [1, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 19, 23, 24, 25, 26] as const;
const MOV_SIGN_OFF = [2, 3, 4, 10, 11, 18, 20, 21, 22] as const;

const WANTED_INHABITANTS = 250;


export async function generateShowcaseInhabitants() {
    let desiredInhabitants = WANTED_INHABITANTS - await db.getAmountOfInhabitants();
    if(desiredInhabitants <= 0) {
        return;
    }
    console.log(`Se van a generar datos de ${WANTED_INHABITANTS} habitantes ficticios.`);
    let inhabitants :Inhabitant[] = [];

    for(let i = WANTED_INHABITANTS - desiredInhabitants; i < WANTED_INHABITANTS; i++) {
        if(typeof process.stdout.cursorTo == "function") {
            process.stdout.write(`Generando habitantes de muestra... ${(i+1).toString().padStart(3, ' ')}/${WANTED_INHABITANTS}`);
            process.stdout.cursorTo(0);
        }

        let gender = Math.random() < 0.05 ? 0 : Math.random() < 0.5 ? 1 : 6;
        let fullName = [pickRandom(gender == 0 ? ANY_GENDER_NAMES : gender == 1 ? MEN_NAMES : WOMEN_NAMES).toUpperCase(), pickRandom(LAST_NAMES).toUpperCase(), pickRandom(LAST_NAMES).toUpperCase()];
        let registered = Math.random() < 0.7;
        let birthDate = getRandomDate(dateFromYearsAgo(60), dateFromYearsAgo(10));
        let registrationDate = getRandomDate(birthDate, dateFromYearsAgo(2));

        let inhabitant :Inhabitant = {
            idDoc: generateRandomIdentifierDoc(),
            fullName: fullName.join(' '),
            isRegistered: toDBBinary(registered),
            registrationDate: registrationDate.toISOString(),
            birthDate: birthDate.toISOString(),
            gender,
            landlinePhone: Math.random() < 0.3 ? getRandomLandlinePhoneNumber() : null,
            mobilePhone: Math.random() < 0.3 ? getRandomMobilePhoneNumber() : null,
            faxNumber: Math.random() < 0.05 ? getRandomMobilePhoneNumber() : null,
            email: Math.random() < 0.3 ? getRandomEmail(fullName[0], fullName[1]) : null,
            instructionLevel: pickRandom(INSTRUCTION_LEVELS),
            lastMoveDate: getRandomDate(registrationDate, dateFromYearsAgo(1)).toISOString(),
            lastMoveType: pickRandom(registered ? MOV_SIGN_ON : MOV_SIGN_OFF),
            fatherName: Math.random() < 0.3 ? pickRandom(MEN_NAMES).toUpperCase() : null,
            motherName: Math.random() < 0.3 ? pickRandom(WOMEN_NAMES).toUpperCase() : null,
            isProtected: toDBBinary(Math.random() < 0.1),
            isParalyzed: toDBBinary(Math.random() < 0.1),
            phoneticName: generatePhoneticName(fullName.join(' ')),
            latinizedName: fullName[0],
            latinizedSurname1: fullName[1],
            latinizedSurname2: fullName[2],
            address: getRandomAddress(),
            postalCode: generateRandomPostalCode(),
            municipality: "ALCALÁ DE HENARES"
        };

        inhabitants.push(inhabitant);
    }

    await db.insertShowcaseInhabitants(inhabitants);
    console.log(`Datos de habitantes ficticios generados.`);
}


function generateRandomIdentifierDoc() {
    if (Math.random() < 0.9) {
        return Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    } else {
        let letters = ['X', 'Y', 'Z'];
        let randomLetter = letters[Math.floor(Math.random() * letters.length)];
        let randomNumber = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        return `${randomLetter}${randomNumber}`;
    }
}


function getRandomDate(startDate :Date, endDate :Date) {
    let minValue = startDate.getTime();
    let maxValue = endDate.getTime();
    let timestamp = Math.floor(Math.random() * (maxValue - minValue + 1) + minValue);
    return new Date(timestamp);
}


function getRandomLandlinePhoneNumber() {
    let areaCodes = ['91', '93', '94', '95', '96', '97', '98'];
    let randomNumber = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    let randomAreaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    return `+34 ${randomAreaCode}${randomNumber}`;
}


function getRandomMobilePhoneNumber() {
    let prefix = Math.floor(Math.random() * 2) + 6; // Prefijo aleatorio entre 6 y 7
    let randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
    return `+34 ${prefix}${randomNumber}`;
}
  

function getRandomEmail(firstName :string, lastName :string) {
    let domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    let randomDigits = Math.floor(Math.random() * 10000);
    let randomDomain = domains[Math.floor(Math.random() * domains.length)];
    return `${removeDiacritics(firstName.toLowerCase())}.${removeDiacritics(lastName.toLowerCase())}${randomDigits}@${randomDomain}`;
}


function removeDiacritics(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
  

function generatePhoneticName(name :string) {
    return name.replace(/[aeiouáéíóúü]/gi, '');
}


function getRandomAddress() {
    let randomIndex = Math.floor(Math.random() * STREET_NAMES.length);
    let randomStreet = STREET_NAMES[randomIndex].toUpperCase();
    let randomNumber = Math.floor(Math.random() * 150) + 1;
    return `${randomStreet} ${randomNumber}`;
}


function generateRandomPostalCode() {
    let randomPostalCode = 28800 + Math.floor(Math.random() * 5) + 1;
    return randomPostalCode.toString();
}


function pickRandom<T>(array: readonly T[]): T {
    let randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}


function toDBBinary(value :boolean): DBBinary {
    if(value) {
        return 'T';
    } else {
        return 'F';
    }
}


function dateFromYearsAgo(years :number) {
    let date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date;
}