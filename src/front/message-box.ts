import * as utils from "./utils.js";

// Este módulo gestiona las ventanas emergentes.


const MSG_BOX = $("#modal-dialog");
const MSG_BOX_ICONS = <const>{
    none: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", // Imagen vacía de 1x1 para usar como placeholder.
    success: "icons/hand-thumbs-up.svg",
    error: "icons/exclamation-circle.svg",
    load: "icons/hourglass.svg"
};


/** Muestra una ventana de información con el icono indicado. Si se especifica una función `onClosed`, se ejecutará cuando el usuario cierre la ventana. */
export function displayMessageBox(message :string, icon :keyof typeof MSG_BOX_ICONS = "none", onClosed? :() => any) {
    MSG_BOX.find("#modal-dialog-message").text(message);
    MSG_BOX.find("#modal-dialog-icon").attr("src", MSG_BOX_ICONS[icon]);
    if(!!onClosed) {
        $("#modal-dialog").one("hidden.bs.modal", onClosed);
    }
    if($(".modal:visible").length == 0) {
        MSG_BOX.modal("show");
    } else {
        // En este caso, ya hay una ventana emergente abierta. Como no podemos tener más de una, tendremos que cerrarla y esperar antes de abrir esta.
        $(".modal:visible").one("hidden.bs.modal", e => {
            MSG_BOX.modal("show");
        });
        $(".modal:visible").modal("hide");
    }
}


/** Muestra una ventana emergente con una animación de carga que no se puede cerrar manualmente. Esta función emite un `loadingHandler` que debe ser
 *  capturado en una variable. Cuando el proceso de carga termine, se debe invocar `loadingHandler.conclude()`, o bien `utils.concludeAndWait(loadingHandler)`
 *  para finalizar visualmente la animación de carga.
 */
export function displayLoadingBox(message :string) {
    const MODAL_FOOTER = MSG_BOX.find(".modal-footer");
    const SPINNER = MSG_BOX.find("#modal-dialog-loading-spinner");
    const MIN_LOADING_TIME_MS = 650;
    let promiseResolve :() => void = () => {};
    
    let waitFinish = new Promise<void>(r => promiseResolve = r); // Promesa secundaria a la que extraemos la función de resolución.
    let mainPromise :Promise<void> | null = null; // Promesa primaria que invoca la ventana emergente.
    
    // La ventana de carga aparecerá solo si la carga no ha concluido (no se ha llamado a loadingHandler.conclude()) dentro de un mínimo de tiempo especificado
    // por MIN_LOADING_TIME_MS. Si concluye dentro del límite de tiempo, no haremos nada.
    let mainPromiseTimeoutHandler = setTimeout(() => mainPromise = new Promise(r => {
        MSG_BOX.find("#modal-dialog-message").text(message);
        MSG_BOX.find("#modal-dialog-icon").attr("src", MSG_BOX_ICONS["load"]);
        
        utils.setCursorLoadingState(true);

        // No queremos ejecutar el método MODAL_FOOTER.show() como parte de la declaración de la promesa secundaria. En su lugar, queremos esperar hasta que la ventana
        // se haya mostrado para no ejecutar la promesa en paralelo. Para ello, creamos una lambda que ejecutaremos cuando queramos comenzar la espera.
        let linkPromise = () => waitFinish.then(() => {
            setTimeout(() => { // El timeout externo es para ocultar la ventana emergente que ya haya abierta.
                setTimeout(() => { // El timeout interno es para mostrar la ventana que queremos abrir y devolver el control al caller.
                    MODAL_FOOTER.show();
                    r();
                }, 500); // Esperamos 500ms porque habitualmente es lo que tarda Bootstrap en cerrar una ventana. Es una estimación que debemos hacer
                         // porque el evento "hidden.bs.modal" ocasionalmente no se activa.
                SPINNER.removeClass("d-flex");
                utils.setMsgBoxDismissable(true);
                MSG_BOX.modal("hide");
                /* setTimeout(() => {
                    if($(".modal:visible").length == 0) {
                        $(".modal-backdrop").remove()
                    }}, 500); */ // En caso de que no desaparezca automáticamente.
            }, MIN_LOADING_TIME_MS);
        });
        
        setTimeout(() => { // Si hay otra ventana en la pantalla, no queremos que esta ventana emergente aparezca de inmediato.
            // Dentro del cuerpo de este timeout, la ventana ya se está mostrando.
            MSG_BOX.modal("show");
            SPINNER.addClass("d-flex");
            MSG_BOX.off("click"); // Desactivamos la posibilidad de cerrar una ventana de carga haciendo click.
            MODAL_FOOTER.hide(); // Desactivamos los botones de la ventana emergente para que no se pueda cerrar con el botón Aceptar.
            utils.setMsgBoxDismissable(false); // Desactivamos la posibilidad de cerrar una ventana de carga pulsando Enter.
            linkPromise(); // Ahora que ya hemos sacado la ventana, activamos la espera de la promesa secundaria.
        }, $(".modal:visible").length != 0 ? 500 : 0);
    }), 500);
    return {
        /** Cierra la ventana de carga y ejecuta el contenido de `then` cuando la ventana termine de cerrarse, si se provee. */
        conclude: (then? :() => void) => {
            utils.setCursorLoadingState(false);
            // Si mainPromise tiene valor, la llamada a conclude ha tardado suficiente para justificar una ventana de carga. La quitamos, esperamos que termine de
            // cerrarse (mainPromise), y devolvemos el control al caller. Si por el contrario mainPromise no tenía valor, la carga ha sido suficientemente breve
            // como para no esperar a ninguna animación ni ventana, y podemos devolver el control al caller de inmediato.
            if(!!mainPromise) {
                mainPromise.then(then);
            } else if(!!then) {
                then();
            }
            // En cualquier caso, en este punto ya no queremos el proceso de activar las promesas, las animaciones y las ventanas, independientemente de si se
            // ha ejecutado ya o todavía no. Lo desactivamos y salimos.
            clearTimeout(mainPromiseTimeoutHandler);
            promiseResolve();
        }
    };
}


/** Descarga todos los iconos del servidor para tenerlos disponibles incluso si hay problemas de conexión más adelante. */
export function preloadMsgBoxIcons() {
    for(let entry of Object.entries(MSG_BOX_ICONS)) {
        let newImgElement = new Image();
        newImgElement.src = entry[1];
        $("#modal-preloaded-icons").append(newImgElement);
    }
}