import * as utils from "./utils.js";

const MSG_BOX = $("#modal-dialog");
const MSG_BOX_ICONS = {
    none: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", // 1x1 blank image to use as placeholder
    success: "icons/hand-thumbs-up.svg",
    error: "icons/exclamation-circle.svg",
    load: "icons/hourglass.svg"
};


let onMessageBoxClosed :(() => any) | null = null;


export function displayMessageBox(message :string, icon :keyof typeof MSG_BOX_ICONS = "none", onClosed? :() => any) {
    MSG_BOX.find("#modal-dialog-message").text(message);
    MSG_BOX.find("#modal-dialog-icon").attr("src", MSG_BOX_ICONS[icon]);
    if(!!onClosed) {
        $("#modal-dialog").one("hidden.bs.modal", () => {console.log("On closed called"); onClosed();});
    }
    if($(".modal:visible").length == 0) {
        MSG_BOX.modal("show");
    } else {
        $(".modal:visible").one("hidden.bs.modal", e => {
            MSG_BOX.modal("show");
        });
        $(".modal:visible").modal("hide");
    }
}


export function displayLoadingBox(message :string) {
    const MODAL_FOOTER = MSG_BOX.find(".modal-footer");
    const SPINNER = MSG_BOX.find("#modal-dialog-loading-spinner");
    const MIN_LOADING_TIME_MS = 500;
    let promiseResolve :() => void = () => {};
    
    let waitFinish = new Promise<void>(r => promiseResolve = r); // Secondary promise that can be resolved externally
    let mainPromise :Promise<void> | null = null; // Main promise that summons the loading window
    
    // The loading window will only appear if the program has been loading for at least some amount of time
    let mainPromiseTimeoutHandler = setTimeout(() => mainPromise = new Promise(r => {
        MSG_BOX.find("#modal-dialog-message").text(message);
        MSG_BOX.find("#modal-dialog-icon").attr("src", MSG_BOX_ICONS["load"]);
        
        utils.setCursorLoadingState(true);

        // Do not link the "show" method to the promise immediately -- We want it to wait until the window has been shown rather than running in parallel
        let linkPromise = () => waitFinish.then(() => {
            setTimeout(() => { // Outer timeout is to cause the other window to hide
                setTimeout(() => { // Inner timeout is to show this one and return control to the caller (after the other window has hidden)
                    MODAL_FOOTER.show();
                    r();
                }, 500);
                SPINNER.removeClass("d-flex");
                utils.setMsgBoxDismissable(true);
                MSG_BOX.modal("hide");
            }, MIN_LOADING_TIME_MS);
        });
        
        setTimeout(() => { // We do not want this to be immediate if there is another visible window on screen
            MSG_BOX.modal("show");
            SPINNER.addClass("d-flex");
            MSG_BOX.off("click"); // A loading window may not be dismissed by clicking away
            MODAL_FOOTER.hide(); // A loading window may not be dismissed by clicking "OK"
            utils.setMsgBoxDismissable(false); // A loading window may not be dismissed by pressing Enter
            linkPromise(); // The window is now shown, the secondary promise may proceed
        }, $(".modal:visible").length != 0 ? 500 : 0);
    }), 500);
    return {
        conclude: (then? :() => void) => { // Call to hide window and wait for it to finish before resuming the caller's task
            utils.setCursorLoadingState(false);
            if(!!mainPromise) { // If mainPromise has been set, conclude took long enough to warrant a loading window. Remove it, wait for it to go, then resume
                mainPromise.then(then);
            } else if(!!then) { // If mainPromise is null, conclude was called too fast and we can resume without showing any loading window
                then();
            }
            // Either way, do not call the window (this line won't do anything if it was already called), then stop waiting
            clearTimeout(mainPromiseTimeoutHandler);
            promiseResolve();
        }
    };
}


export function preloadMsgBoxIcons() {
    for(let entry of Object.entries(MSG_BOX_ICONS)) {
        let newImgElement = new Image();
        newImgElement.src = entry[1];
        $("#modal-preloaded-icons").append(newImgElement);
    }
}