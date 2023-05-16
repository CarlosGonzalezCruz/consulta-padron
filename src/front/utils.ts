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


let msgBoxIsDismissable = false;


export function isMsgBoxDismissable() {
    return msgBoxIsDismissable;
}


export function setMsgBoxDismissable(value = true) {
    msgBoxIsDismissable = value;
}


export function addModalButtonKeybinding() {
    $(document).on("keypress", e => {
        if(e.key == "Enter") {
            if(msgBoxIsDismissable) {
                e.preventDefault();
                $(".modal:visible input").trigger("blur");
                $(".modal:visible .modal-footer .btn:last-child").get(0)?.click();
            }
        }
    });
}


export function getSelectedNewbornIds() {
    let ret :string[] = [];
    $("#newborns-table-body tr").has(":checkbox:checked").each(function() {
        ret.push($(this).attr("newborn-id") as string);
    })
    return ret;
}


export async function displayProfileEnvironmentLabel() {
    let label = await (await fetch("profile-environment")).text();
    if(!!label) {
        $("#profile-environment-label").text(label);
    }
}