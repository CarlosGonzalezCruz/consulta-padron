export function concludeAndWait(loadingHandler :{ conclude :(then? :() => void) => void}) {
    return new Promise<void>(r => {
        loadingHandler.conclude(r);
    });
}


export function setCursorLoadingState(state :boolean) {
    if(state) {
        $("body").css("cursor", "progress");
    } else {
        $("body").css("cursor", "default");
    }
}


export function documentReady() {
    return new Promise<void>(resolve => {
        jQuery(resolve);
    });
}


let msgBoxIsDismissable = true;


export function isMsgBoxDismissable() {
    return msgBoxIsDismissable;
}


export function setMsgBoxDismissable(value = true) {
    msgBoxIsDismissable = value;
}


export function addModalButtonKeybinding() {
    $(document).on("keypress", e => {
        if(e.key == "Enter") {
            if(msgBoxIsDismissable && $(".modal").is(":visible")) {
                e.preventDefault();
                $(".modal:visible input").trigger("blur");
                $(".modal:visible .modal-footer .btn:last-child").get(0)?.click();
                return false;
            }
        }
    });
}


export function playCssAnimationOnce(jQueryElement :JQuery<HTMLElement>, cssClass :string) {
    return new Promise<void>(resolve => {
        jQueryElement.addClass(cssClass).one("animationend", function() {
            $(this).removeClass(cssClass);
            resolve();
        });
    })
}


export async function displayProfileEnvironmentLabel() {
    let label = await (await fetch("profile-environment")).text();
    if(!!label) {
        $("#profile-environment-label").text(label);
    }
}


export function enforceDigits(value :string | number, minDigits :number) {
    if(typeof value != "string") {
        value = value.toString();
    }
    return "0".repeat(Math.max(minDigits - value.length, 0)) + value;
}


export function writeBoolean(value :Boolean | DBBinary | null) {
    if(value == null) {
        return null;
    } else {
        return (value == true || value == 'T') ? "Sí" : "No";
    }
}