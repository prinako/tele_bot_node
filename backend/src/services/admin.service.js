import * as adminRepository from "../repositories/admin.repository.js";

async function getStats() {
  return adminRepository.getStats();
}

async function getPixKeys() {
  return adminRepository.getPixKeys();
}

async function getAgendaPayments() {
  return adminRepository.getAgendaPayments();
}

export { getAgendaPayments, getPixKeys, getStats };
