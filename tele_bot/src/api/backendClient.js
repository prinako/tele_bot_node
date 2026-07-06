import env from "../config/env.js";

const baseUrl = env.backendUrl.replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.error || `Backend request failed: ${response.status}`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function upsertUser(user) {
  return request("/api/users/upsert", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

async function upsertBotInstallation(data) {
  return request("/api/bot-installations/upsert", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertBotInstallationTopic(data) {
  return request("/api/bot-installations/topics/upsert", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertBotInstallationUser(data) {
  return request("/api/bot-installations/users/upsert", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function getBotInstallations() {
  return request("/api/bot-installations");
}

async function getBotInstallationTopics(telegramChatId) {
  return request(`/api/bot-installations/${telegramChatId}/topics`);
}

async function getBotInstallationUsers(telegramChatId) {
  return request(`/api/bot-installations/${telegramChatId}/users`);
}

async function getBotInstallation(telegramChatId) {
  return request(`/api/bot-installations/${telegramChatId}`);
}

async function getUserBotInstallations(telegramUserId) {
  return request(`/api/users/${telegramUserId}/bot-installations`);
}

async function createAgendaPayment(data) {
  return request("/api/agenda", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function getAllAgendaPayments() {
  return request("/api/agenda");
}

async function getAgendaPaymentsByUser(telegramId) {
  return request(`/api/agenda/user/${telegramId}`);
}

async function getAgendaPaymentById(id) {
  return request(`/api/agenda/${id}`);
}

async function updateAgendaPayment(id, data, telegramId = null) {
  const query = telegramId
    ? `?telegramId=${encodeURIComponent(telegramId)}`
    : "";
  return request(`/api/agenda/${id}${query}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

async function deleteAgendaPayment(id) {
  return request(`/api/agenda/${id}`, { method: "DELETE" });
}

async function registerPix(data) {
  return request("/api/pix", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function getUserPixBySenderBank(senderId, bank) {
  return request(
    `/api/pix?senderId=${encodeURIComponent(senderId)}&bank=${
      encodeURIComponent(bank)
    }`,
  );
}

async function getBanks() {
  return request("/api/banks");
}

async function updatePix(id, data) {
  return request(`/api/pix/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

async function getAgendaPaymentMembers(id) {
  return request(`/api/agenda/${id}/members`);
}

async function markAgendaPaymentMemberPaid(id, telegramId) {
  return request(`/api/agenda/${id}/members/${telegramId}/paid`, {
    method: "PATCH",
  });
}

async function markAgendaPaymentMemberUnpaid(id, telegramId) {
  return request(`/api/agenda/${id}/members/${telegramId}/unpaid`, {
    method: "PATCH",
  });
}

function insetAgendaPayment(data, next) {
  createAgendaPayment(data)
    .then((agenda) => next(agenda))
    .catch((error) => {
      console.error(error);
      next(false);
    });
}

function getAllAgendaPayment(next) {
  getAllAgendaPayments()
    .then((agendas) => next(agendas))
    .catch((error) => {
      console.error(error);
      next(false);
    });
}

async function getAllAgendaPaymentBySender(senderId) {
  try {
    return await getAgendaPaymentsByUser(senderId);
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function insetPix(data, next) {
  try {
    const pix = await registerPix(data);
    return next({ error: false, returnData: pix });
  } catch (error) {
    console.error(error);
    return next({ error: true, returnData: error.data || error });
  }
}

function updatePixWithCallback(id, data, next) {
  updatePix(id, data)
    .then((pix) => next(pix))
    .catch((error) => {
      console.error(error);
      next(false);
    });
}

export {
  createAgendaPayment,
  deleteAgendaPayment,
  getAgendaPaymentById,
  getAgendaPaymentMembers,
  getAgendaPaymentsByUser,
  getAllAgendaPayment,
  getAllAgendaPaymentBySender,
  getAllAgendaPayments,
  getBanks,
  getBotInstallation,
  getBotInstallations,
  getBotInstallationTopics,
  getBotInstallationUsers,
  getUserPixBySenderBank,
  getUserBotInstallations,
  insetAgendaPayment,
  insetPix,
  markAgendaPaymentMemberPaid,
  markAgendaPaymentMemberUnpaid,
  registerPix,
  updateAgendaPayment,
  updatePixWithCallback as updatePix,
  upsertBotInstallation,
  upsertBotInstallationTopic,
  upsertBotInstallationUser,
  upsertUser,
};
