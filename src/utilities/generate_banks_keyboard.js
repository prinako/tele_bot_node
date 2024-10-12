
/**
 * Generates a keyboard for selecting banks.
 * @return {Object[][]} a 2D array of objects where each object has a text and a callback_data property
 */
function generateBankKeyboard(next) {
    // List of banks to be displayed in the keyboard
    const bankList = [
        {text: 'Bradesco', callback_data: 'Bradesco'},
        {text: 'Itau', callback_data: 'Itau'},
        {text: 'Santander', callback_data: 'Santander'},
        {text: 'Caixa', callback_data: 'Caixa'},
        {text: 'Nubank', callback_data: 'Nubank'},
        {text: 'Inter', callback_data: 'Inter'},
        {text: 'Banco do Brasil', callback_data: 'Banco do Brasil'},
        {text: 'Next', callback_data: 'Next'},
        {text: 'C6 Bank', callback_data: 'C6 Bank'},
        {text: 'Picpay', callback_data: 'Picpay'},
        {text: 'Neon', callback_data: 'Neon'},
    ];

    // Group the list of banks in rows of 2
    const groupedBanks = bankList.reduce((acc, cur, idx) => {
        if (idx % 2 === 0) {
            acc.push([cur]);
        } else {
            acc[acc.length - 1].push(cur);
        }
        return acc;
    }, []);

    // Map the grouped banks to the format required by the Telegram API
    return next( groupedBanks.map(b => b.map(bk => ({
        text: bk.text,
        callback_data: `bank_${bk.callback_data }`
    }))));
}

module.exports = generateBankKeyboard;