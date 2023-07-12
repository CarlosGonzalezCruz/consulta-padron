
// Este módulo define funciones misceláneas que no corresponden a una tarea concreta. Como queremos poder acceder a este módulo desde el
// resto de módulos, se debe evitar agregar dependencias de otros módulos del programa aquí. Sin embargo, sí se permiten dependencias externas.


/** Dado un `loadingHandler`, cierra la ventana de carga y se espera a que el handler considere que ya ha terminado. */
export function concludeAndWait(loadingHandler :{ conclude :(then? :() => void) => void}) {
    return new Promise<void>(r => {
        loadingHandler.conclude(r);
    });
}


/** Espera una cantidad de tiempo fija, especificada en milisegundos. */
export async function wait(timeMs :number) {
    return new Promise<void>(r => setTimeout(r, timeMs));
}


/** Alterna entre el cursor que representa procesando (`true`) y el habitual (`false`). */
export function setCursorLoadingState(state :boolean) {
    if(state) {
        $("body").css("cursor", "progress");
    } else {
        $("body").css("cursor", "default");
    }
}


/** Espera a que el DOM haya terminado de cargar. */
export function documentReady() {
    return new Promise<void>(resolve => {
        jQuery(resolve);
    });
}

// Las siguientes indican si la ventana se puede cerrar manualmente o no (por ejemplo, si es una ventana de carga). Se define aquí
// para evitar acoplamientos entre el módulo que define los mensajes y el resto.

let msgBoxIsDismissable = true;

/** ¿La ventana de mensajes se puede cerrar manualmente? */
export function isMsgBoxDismissable() {
    return msgBoxIsDismissable;
}

/** Indica si la ventana de mensajes se puede cerrar manualmente o no (por ejemplo, para una ventana de carga). */
export function setMsgBoxDismissable(value = true) {
    msgBoxIsDismissable = value;
}


/** Activa el uso de Enter para cerrar una ventana emergente. */
export function addModalButtonKeybinding() {
    $(document).on("keypress", e => {
        if(e.key == "Enter") {
            if(msgBoxIsDismissable && $(".modal").is(":visible")) {
                e.preventDefault(); // No queremos que otros elementos del DOM usen el evento de pulsar la tecla Enter.
                $(".modal:visible input").trigger("blur"); // Si hay algún campo de input, le quitamos el foco.
                $(".modal:visible .modal-footer .btn:last-child").get(0)?.click(); // Mandamos un click al botón de la derecha (normalmente, el botón primario).
                return false;
            }
        }
    });
}


/** Ejecuta en el elemento seleccionado la animación que corresponda a una clase de CSS, sin asignar dicha clase de CSS permanentemente. La animación
 *  comenzará en el momento en el que se ejecute esta función. Devuelve una promesa que se resolverá cuando la animación termine.
 */
export function playCssAnimationOnce(jQueryElement :JQuery<HTMLElement>, cssClass :string) {
    return new Promise<void>(resolve => {
        if(!jQueryElement.hasClass(cssClass)) {
            jQueryElement.addClass(cssClass);
            // En otro caso, la animación ya se está reproduciendo y no necesitamos hacer nada.
        }
        jQueryElement.one("animationend", function() {
            // Cuando la animación acabe, le quitamos la clase, de manera que si se la ponemos de nuevo la animación vuelva a reproducirse.
            jQueryElement.removeClass(cssClass);
            resolve();
        });
    })
}


/** Consulta al servidor para obtener el nombre del actual entorno de ejecución. */
export async function displayProfileEnvironmentLabel() {
    let label = await (await fetch("profile-environment")).text();
    if(!!label) {
        $("#profile-environment-label").text(label);
    }
}


/** Representa números pequeños con texto para mejorar la legibilidad de los textos en los que aparezcan (p.ej _«los dos usuarios»_ en lugar de _«los 2 usuarios»_).
 *  No altera los valores negativos ni los valores superiores a 9.
 */
export function displayNumberAsText(value :number) {
    if(value < 0 || value > 9) {
        return value.toString();
    } else {
        return ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"][value];
    }
}


/** Representa un número con el mínimo de digitos que se especifique, añadiendo ceros a la izquierda. P.ej, para `minDigits`= 3: 5 → 005, 100 → 100.
 *  El número se pasa como string y no se contempla que sea negativo. 
 */
export function enforceDigits(value :string | number, minDigits :number) {
    if(typeof value != "string") {
        value = value.toString();
    }
    return "0".repeat(Math.max(minDigits - value.length, 0)) + value;
}


/** Representa un valor lógico como "Sí" (`true`, `"T"`) o "No" (`false`, `"F"`). Si el valor es nulo, el resultado también es nulo. */
export function writeBoolean(value :Boolean | DBBinary | null) {
    if(value == null) {
        return null;
    } else {
        return (value == true || value == 'T') ? "Sí" : "No";
    }
}