import {
  deleteAgendaPayment,
  getAgendaPaymentById,
  getAllAgendaPayment,
  getAllAgendaPaymentBySender,
  insetAgendaPayment,
  updateAgendaPayment,
} from "../repositories/agenda.repository.js";

/**
 * @param {Object} data - The data to create the agenda payment.
 * @return {Promise<Object>} The created agenda payment.
 */
function createAgendaPayment(data) {
  return new Promise((resolve) => {
    insetAgendaPayment(data, resolve);
  });
}

/**
 * @return {Promise<Array>} The all agenda payments.
 */
function getAllAgendaPayments() {
  return new Promise((resolve) => {
    getAllAgendaPayment(resolve);
  });
}

/**
 * @param {number} telegramId - The Telegram user id.
 * @return {Promise<Array>} The agenda payments by user.
 */
async function getAgendaPaymentsByUser(telegramId) {
  return getAllAgendaPaymentBySender(telegramId);
}

/**
 * @param {number} id - The id of the agenda payment.
 * @return {Promise<Object>} The agenda payment by id.
 */
async function getAgendaPayment(id) {
  return getAgendaPaymentById(id);
}

/**
 * @param {number} id - The id of the agenda payment.
 * @param {Object} data - The data to update the agenda payment.
 * @param {number|null} telegramId - The Telegram user id.
 * @return {Promise<Object>} The updated agenda payment.
 */
async function updateAgenda(id, data, telegramId = null) {
  return updateAgendaPayment(id, data, telegramId);
}

/**
 * @param {number} id - The id of the agenda payment.
 * @return {Promise<Object>} The deleted agenda payment.
 */
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
