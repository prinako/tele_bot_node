const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

function body(data) {
  return JSON.stringify(data);
}

export function getStats() {
  return request("/api/admin/stats");
}

export function getUsers() {
  return request("/api/users");
}

export function updateUser(telegramId, data) {
  return request(`/api/users/${telegramId}`, {
    method: "PATCH",
    body: body(data),
  });
}

export function getBanks() {
  return request("/api/banks?includeInactive=true");
}

export function createBank(data) {
  return request("/api/banks", {
    method: "POST",
    body: body(data),
  });
}

export function updateBank(id, data) {
  return request(`/api/banks/${id}`, {
    method: "PATCH",
    body: body(data),
  });
}

export function getPixKeys() {
  return request("/api/admin/pix");
}

export function updatePix(id, data) {
  return request(`/api/pix/${id}`, {
    method: "PATCH",
    body: body(data),
  });
}

export function getAgendaPayments() {
  return request("/api/admin/agenda");
}

export function getAgendaPayment(id) {
  return request(`/api/agenda/${id}`);
}

export function updateAgendaPayment(id, data) {
  return request(`/api/agenda/${id}`, {
    method: "PATCH",
    body: body(data),
  });
}

export function deleteAgendaPayment(id) {
  return request(`/api/agenda/${id}`, {
    method: "DELETE",
  });
}

export function getAgendaMembers(id) {
  return request(`/api/agenda/${id}/members`);
}

export function markAgendaMemberPaid(id, telegramId) {
  return request(`/api/agenda/${id}/members/${telegramId}/paid`, {
    method: "PATCH",
  });
}

export function markAgendaMemberUnpaid(id, telegramId) {
  return request(`/api/agenda/${id}/members/${telegramId}/unpaid`, {
    method: "PATCH",
  });
}
