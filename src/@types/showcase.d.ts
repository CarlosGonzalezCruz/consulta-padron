
declare type Inhabitant = {
    idDoc: string | null;
    fullName: string | null;
    isRegistered: DBBinary | null;
    registrationDate: string | null;
    birthDate: string | null;
    gender: number | null;
    landlinePhone: string | null;
    mobilePhone: string | null;
    faxNumber: string | null;
    email: string | null;
    instructionLevel: string | null;
    lastMoveDate: string | null;
    lastMoveType: number | null;
    fatherName: string | null;
    motherName: string | null;
    isProtected: DBBinary | null;
    isParalyzed: DBBinary | null;
    phoneticName: string | null;
    latinizedName: string | null;
    latinizedSurname1: string | null;
    latinizedSurname2: string | null;
    address: string | null;
    postalCode: string | null;
    municipality: string | null;
}