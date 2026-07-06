function parseMoney(value) {
    if (typeof value === 'number') {
        return value;
    }

    const normalized = String(value ?? '')
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
}

export {
    parseMoney,
};
