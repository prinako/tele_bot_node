/**
 * Formats the agenda object into a string that can be sent to the user.
 * @param {Object} agenda - The agenda object containing the payment information.
 * @returns {string} The formatted string.
 */
function agendaFormatter(agenda) {
    return `⚠️⚠️ *ATTENTION ${agenda.title.toUpperCase()} BILL* ⚠️⚠️\n\n`  +
            `R$ ${agenda.amount} \n\n` +
            `*Vencimento:* ${agenda.date}\n\n` +
            `Descric o da fatura: ${agenda.description}\n\n` +
            `Pix Chave (${agenda.bank}): \`${agenda.pix}\`\n\n` +
            `--------------------------------\n` +
            `Sadat ${agenda.sadat ?  '  ✅' :  '  ❌'} \n` +
            `Sam ${agenda.sam ?  '  ✅' : '   ❌'} \n` + 
            `Prince ${agenda.prince ? ' ✅' : '  ❌'} \n` +
            `--------------------------------\n\n`;   
}


export default agendaFormatter;