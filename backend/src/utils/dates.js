function parseDueDate(value) {
    const text = String(value ?? '');
    const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brazilianDate) {
        const [, day, month, year] = brazilianDate;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return text;
}

export {
    parseDueDate,
};
