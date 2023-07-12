
// Aquí se definen tipos auxiliares no proporcionados ni por Typescript ni por librerías, que necesitamos usar igualmente. Estos
// tipos son accesibles tanto en back como en front.

/** Extensión de la definición de Array para añadir nuevos métodos que no existen en la librería estándar. */
interface Array<T> {
    /** Devuelve true si el objeto indicado se encuentra en el array. */
    contains(o :T) :boolean;
    /** Equivalente asíncrono de la función `map`. Se espera una función de conversión asíncrona, y devuelve una promesa que se resolverá una vez
     *  concluya la función de conversión para todos los elementos. */
    asyncMap<U>(fn :(value :T) => Promise<U>) :Promise<Awaited<U>[]>;
}


/** Convención de verdadero/falso utilizada en las bases de datos del ayuntamiento. */
declare type DBBinary = 'T' | 'F';
/** Métodos REST de uso habitual para endpoints. */
declare type RequestMethod = "GET" | "PUT" | "POST" | "DELETE";

/** Formato de datos de una cuenta de usuario tal y como se almacena en MySQL. */
declare type User = {
    id :number,
    /** Nombre del usuario. No se permiten dos usuarios con el mismo nombre. */
    username :string,
    /** Id del rol de este usuario. */
    role :number,
    /** Un usuario es auxiliar si no corresponde a un usuario de LDAP, como el administrador auxiliar. */
    isAuxiliar :DBBinary
}

/** Formato de datos de un rol tal y como se almacena en MySQL. */
declare type Role = {
    id :number,
    name :string,
    /** ¿Las cuentas de nueva creación tendrán este rol? Solo se permite un rol predeterminado. */
    isDefault :DBBinary,
    /** ¿Las cuentas con este rol tendrán acceso al panel de administración? */
    isAdmin :DBBinary,
    /** Id del rol base de este rol. */
    parent :number | null,
    /** Entradas que este rol puede consultar. Si no se especifica una, se usará el permiso equivalente del rol base. */
    entries :RolePermissions
}

/** Descripción de permisos que puede poseer un rol. Un valor nulo o no definido indica que el rol espera complementar esa información
 *  con el valor correspondiente a su rol base.
 */
declare type RolePermissions = {
    [key :string] :boolean | null;
}


/** Descripción de permisos efectivos de un rol. Este tipo indica explícitamente que la información sobre permisos está completa y no
 *  es necesario consultar un rol base.
 */
declare type EffectiveRolePermissions = {
    [key :string] :boolean;
}


/** Describe el formato de una entrada. Las entradas definen las columnas de un habitante que se pueden consultar desde el cliente web. */
declare type EntryData = {
    /** Clave única que identifica el permiso para consultar esta entrada. */
    permissionKey :string,
    /** Texto que se mostrará para representar esta entrada de cara al usuario. */
    displayKey :string,
    /** Campo de la base de datos, incluyendo prefijo de tabla, que contiene el valor de esta entrada. */
    field :string,
    /** ¿Excluir esta entrada de las listas de entradas del cliente web? */
    hide? :boolean,
    /** Función de conversión del valor recibido, para mostrarlo al usuario de forma más legible. */
    render?: (v :any) => Promise<string | null> | string | null
}