

// Este módulo almacena temporalmente algunos datos de la sesión en el navegador.


let sessiondata :{
    username :string,
    token :string
} | null = null;


export function exists() {
    refreshSession();
    return sessiondata != null;
}


export function getUsername() {
    refreshSession();
    return sessiondata?.username;
}


export function getToken() {
    refreshSession();
    return sessiondata?.token;
}


export function start(data :{username :string, token :string}) {
    sessiondata = Object.freeze(data);
    sessionStorage.setItem("sessiondata", JSON.stringify(sessiondata));
}


export function end() {
    sessiondata = null;
    sessionStorage.removeItem("sessiondata");
}


function refreshSession() {
    if(sessiondata == null && !!sessionStorage.getItem("sessiondata")) {
        sessiondata = JSON.parse(sessionStorage.getItem("sessiondata")!);
    }
}