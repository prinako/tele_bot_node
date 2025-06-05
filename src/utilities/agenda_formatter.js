/**
 * Formats the agenda object into a string that can be sent to the user.
 * @param {Object} agenda - The agenda object containing the payment information.
 * @returns {string} The formatted string.
 */
function agendaFormatter(agenda) {
    return `⚠️⚠️ *ATTENTION ${agenda.title.toUpperCase()} BILL* ⚠️⚠️\n\n`  +
            `R$ ${agenda.amount} \n\n` +
            `*Vencimento:* ${agenda.date}\n\n` +
            `Descrição da fatura: ${agenda.description}\n\n` +
            `⚠️ Favor informar, na descrição do pagamento, o nome da fatura correspondente. Obrigado! ⚠️\n\n` +
            `Pix Chave (${agenda.bank}): \`${agenda.pix}\`\n\n` +
            `--------------------------------\n` +
            `Sadat ${agenda.sadat ?   ' ✅' : '  ❌'} \n` +
            `Frank ${agenda.frank ?   ' ✅' : '  ❌'} \n` + 
            `Prince ${agenda.prince ? ' ✅' : '  ❌'} \n` +
            `--------------------------------\n\n`;   
}


export default agendaFormatter;