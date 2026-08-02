import getMemberName from "./get_member_name";

/**
 * Checks if a member has paid.
 * @param {Object} member - The member object.
 * @returns {boolean} True if the member has paid, false otherwise.
 */
function memberPaid(member = {}) {
  return Boolean(
    member.isPaid ||
      member.paid ||
      member.hasPaid ||
      member.paidStatus,
  );
}

/**
 * Formats the agenda object into a string that can be sent to the user.
 * @param {Object} agenda - The agenda object containing the payment information.
 * @returns {string} The formatted string.
 */
export default function agendaFormatter(agenda) {
  const members = Array.isArray(agenda.members) ? agenda.members : [];
  const memberLines = members.length > 0
    ? members
      .filter((member) => member.isResponsible !== false)
      .map((member) =>
        `${getMemberName(member)} ${memberPaid(member) ? " ✅" : "  ❌"}`
      )
      .join(" \n")
    : `Pago ${agenda.isPaid ? " ✅" : "  ❌"}`;

  return `⚠️⚠️ *ATTENTION ${agenda.title.toUpperCase()} BILL* ⚠️⚠️\n\n` +
    `R$ ${agenda.amount} \n\n` +
    `*Vencimento:* ${agenda.date}\n\n` +
    `Descrição da fatura: ${agenda.description}\n\n` +
    `⚠️ Favor informar, na descrição do pagamento, o nome da fatura correspondente. Obrigado! ⚠️\n\n` +
    `Pix Chave (${agenda.bank}): \`${agenda.pix}\`\n\n` +
    `--------------------------------\n` +
    `${memberLines}\n` +
    `--------------------------------\n\n`;
}