import {
  getAgendaPaymentById,
  updateAgendaPayment,
} from "../repositories/agenda.repository.js";
import { getMembersByAgendaPaymentId } from "../repositories/paymentMembers.repository.js";

async function getMembers(agendaId) {
  const agenda = await getAgendaPaymentById(agendaId);
  if (!agenda) {
    return false;
  }

  return getMembersByAgendaPaymentId(agendaId);
}

async function markPaid(agendaId, telegramId) {
  return updateAgendaPayment(agendaId, { isPaid: true, telegramId });
}

async function markUnpaid(agendaId, telegramId) {
  return updateAgendaPayment(agendaId, { isPaid: false, telegramId });
}

export { getMembers, markPaid, markUnpaid };
