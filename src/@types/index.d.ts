

interface Array<T> {
    contains(o :T) :boolean;
    asyncMap<U>(fn :(value :T) => Promise<U>) :Promise<Awaited<U>[]>;
}


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
    entries :string
}
