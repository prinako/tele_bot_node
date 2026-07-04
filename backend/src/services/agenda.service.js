import {
    deleteAgendaPayment,
    getAgendaPaymentById,
    getAllAgendaPayment,
    getAllAgendaPaymentBySender,
    insetAgendaPayment,
    updateAgendaPayment,
} from '../repositories/agenda.repository.js';

function createAgendaPayment(data) {
    return new Promise((resolve) => {
        insetAgendaPayment(data, resolve);
    });
}

function getAllAgendaPayments() {
    return new Promise((resolve) => {
        getAllAgendaPayment(resolve);
    });
}

async function getAgendaPaymentsByUser(telegramId) {
    return getAllAgendaPaymentBySender(telegramId);
}

async function getAgendaPayment(id) {
    return getAgendaPaymentById(id);
}

async function updateAgenda(id, data, telegramId = null) {
    return updateAgendaPayment(id, data, telegramId);
}

async function deleteAgenda(id) {
    return deleteAgendaPayment(id);
}

export {
    createAgendaPayment,
    deleteAgenda,
    getAgendaPayment,
    getAgendaPaymentsByUser,
    getAllAgendaPayments,
    updateAgenda,
};
