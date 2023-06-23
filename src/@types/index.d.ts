

interface Array<T> {
    contains(o :T) :boolean;
    asyncMap<U>(fn :(value :T) => Promise<U>) :Promise<Awaited<U>[]>;
}


declare type DBBinary = 'T' | 'F';
declare type RequestMethod = "GET" | "PUT" | "POST" | "DELETE";

declare type User = {
    id :number,
    username :string,
    role :number,
    isAuxiliar :DBBinary
}

declare type Role = {
    id :number,
    name :string,
    isDefault :DBBinary,
    isAdmin :DBBinary,
    parent :number,
    entries :string
}


declare type RolePermissions = {
    [key :string] :boolean | null;
}


declare type EffectiveRolePermissions = {
    [key :string] :boolean;
}