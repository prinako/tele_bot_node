function cleanText(value) {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" ? text : null;
}

function getAgendaMemberDisplayName(member = {}) {
  const username = cleanText(
    member.username ||
      member.telegramUsername ||
      member.user?.username ||
      member.user?.telegramUsername,
  );

  const firstName = cleanText(
    member.firstName ||
      member.first_name ||
      member.user?.firstName ||
      member.user?.first_name,
  );

  const lastName = cleanText(
    member.lastName ||
      member.last_name ||
      member.user?.lastName ||
      member.user?.last_name,
  );

  const displayName = cleanText(
    member.displayName ||
      member.display_name ||
      member.user?.displayName ||
      member.user?.display_name,
  );

  if (displayName) {
    return displayName;
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return String(
    member.telegramId ||
      member.telegram_id ||
      member.user?.telegramId ||
      member.user?.telegram_id ||
      member.user_id ||
      member.id ||
      "Unknown",
  );
}

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
function agendaFormatter(agenda) {
  const members = Array.isArray(agenda.members) ? agenda.members : [];
  const memberLines = members.length > 0
    ? members
      .filter((member) => member.isResponsible !== false)
      .map((member) =>
        `${getAgendaMemberDisplayName(member)} ${memberPaid(member) ? " ✅" : "  ❌"}`
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

export { getAgendaMemberDisplayName };

export default agendaFormatter;
