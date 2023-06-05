
declare type DBBinary = 'T' | 'F';

declare type User = {
    username :string,
    role :number
}

declare type Role = {
    id :number,
    name :string,
    isDefault :DBBinary,
    isAdmin :DBBinary,
    parent :number,
    entries :null
}
