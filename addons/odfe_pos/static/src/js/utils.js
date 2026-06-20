/** @odoo-module */
export function formatCurrency(amount, currency = "$") {
    return `${currency}${Number(amount).toFixed(2)}`;
}

export function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString();
}

export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
        const k = item[key];
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
    }, {});
}

export function truncate(str, len = 30) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "..." : str;
}

export function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}
