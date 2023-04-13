

export function documentReady() {
    return new Promise<void>(resolve => {
        jQuery(resolve);
    });
}