export function setCookie(name, value, days = 7) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    try {
        const stringValue = JSON.stringify(value);
        // Check size limit: max 4KB for a cookie
        if (stringValue.length > 4000) {
            console.warn(`[cookieUtils] Cookie ${name} might exceed the 4KB limit. Length: ${stringValue.length}`);
        }
        const safeValue = encodeURIComponent(stringValue);
        document.cookie = name + '=' + safeValue + expires + '; path=/';
    } catch (e) {
        console.error('[cookieUtils] Failed to set cookie:', e);
    }
}

export function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            try {
                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
            } catch (e) {
                console.error('[cookieUtils] Failed to parse cookie:', e);
                // If parsing fails, it might not have been JSON encoded properly
                return null;
            }
        }
    }
    return null;
}
