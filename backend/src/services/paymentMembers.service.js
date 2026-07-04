import { getAgendaPaymentById, updateAgendaPayment } from '../repositories/agenda.repository.js';

async function getMembers(agendaId) {
    const agenda = await getAgendaPaymentById(agendaId);
    return agenda ? agenda.members : false;
}

async function markPaid(agendaId, telegramId) {
    return updateAgendaPayment(agendaId, { isPaid: true, telegramId });
}

async function markUnpaid(agendaId, telegramId) {
    return updateAgendaPayment(agendaId, { isPaid: false, telegramId });
}

export {
    getMembers,
    markPaid,
    markUnpaid,
};
