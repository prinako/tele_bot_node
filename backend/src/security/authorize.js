// All delegated identities are accepted only after authenticating the trusted bot.
// Browser clients cannot choose a Telegram identity.
const deny = (res, message = "Permission denied") => res.status(403).json({ error: message });
const equal = (a, b) => String(a) === String(b);
const registration = new Set([
  "/api/users/upsert", "/api/bot-installations/upsert",
  "/api/bot-installations/topics/upsert", "/api/bot-installations/users/upsert",
]);

function responsibleIdsOnly(body) {
  const result = { ...body };
  for (const field of ["members", "responsibleUserIds", "responsibleTelegramIds"]) {
    if (Array.isArray(result[field])) result[field] = result[field].map((value) =>
      value && typeof value === "object"
        ? value.telegramId || value.telegram_id || value.senderId || value.id
        : value);
  }
  return result;
}

export function createAuthorization(query) {
  async function member(telegramId, chatId) {
    const result = await query(`SELECT 1 FROM bot_installation_users biu
      JOIN bot_installations bi ON bi.id = biu.bot_installation_id
      WHERE biu.telegram_user_id = $1 AND bi.telegram_chat_id = $2
        AND bi.bot_status = 'active' LIMIT 1`, [telegramId, chatId]);
    return result.rowCount > 0;
  }
  return async function authorize(req, res, next) {
    if (req.auth.role === "admin") return next();
    const path = req.path.replace(/\/$/, "");
    const method = req.method === "HEAD" ? "GET" : req.method;
    if (method === "POST" && registration.has(path)) return next();
    // The scheduler has no delegated actor and can only read pending bills.
    if (!req.auth.telegramId) {
      if (method === "GET" && path === "/api/agenda") return next();
      return deny(res, "Telegram identity required");
    }
    const result = await query("SELECT * FROM users WHERE telegram_id = $1", [req.auth.telegramId]);
    const user = result.rows[0];
    if (!user?.is_allowed) return deny(res, "User is not allowed");
    req.auth.user = user;
    if (user.is_admin) return next();
    const actor = req.auth.telegramId;
    const body = req.body || {};
    const allow = (condition) => condition ? next() : deny(res);

    if (method === "GET" && path === "/api/auth/me") return next();
    if (method === "GET" && /^\/api\/banks(?:\/[^/]+)?$/.test(path)) return next();
    if (method === "GET" && path === `/api/users/${actor}`) return next();
    if (method === "GET" && path === `/api/users/${actor}/bot-installations`) return next();
    if (path === "/api/pix") {
      if (method === "GET") return allow(equal(req.query.senderId, actor));
      if (method === "POST") {
        // Remove alternative identity sources; registration uses the verified actor.
        req.body = { pix: body.pix, bank: body.bank, bankId: body.bankId, telegramId: actor };
        return next();
      }
    }
    if (method === "PATCH" && /^\/api\/pix\/[^/]+$/.test(path)) {
      const pix = await query("SELECT user_id FROM pix_keys WHERE id = $1", [path.split("/").at(-1)]);
      if (!equal(pix.rows[0]?.user_id, user.id)) return deny(res);
      req.body = { ...(body.pix !== undefined && { pix: body.pix }), ...(body.bank !== undefined && { bank: body.bank }), ...(body.bankId !== undefined && { bankId: body.bankId }) };
      return next();
    }
    const installation = path.match(/^\/api\/bot-installations\/(-?\d+)(?:\/(users|topics))?$/);
    if (method === "GET" && installation) return allow(await member(actor, installation[1]));
    if (method === "POST" && path === "/api/agenda") {
      if (!body.chatId || !await member(actor, body.chatId)) return deny(res);
      req.body = { ...responsibleIdsOnly(body), senderId: actor, telegramId: actor, user: undefined, sender: undefined, from: undefined, isPaid: false };
      return next();
    }
    if (method === "GET" && path === `/api/agenda/user/${actor}`) return next();
    const agendaPath = path.match(/^\/api\/agenda\/([^/]+)(?:\/members(?:\/(\d+)\/(paid|unpaid))?)?$/);
    if (agendaPath) {
      const agenda = await query(`SELECT ap.created_by_user_id, ap.chat_id FROM agenda_payments ap WHERE ap.id = $1`, [agendaPath[1]]);
      const row = agenda.rows[0];
      if (!row) return res.status(404).json({ error: "Agenda payment not found" });
      const creator = equal(row.created_by_user_id, user.id);
      if (method === "GET") return allow(creator || await member(actor, row.chat_id));
      if (method === "DELETE") return allow(creator);
      if (method === "PATCH") {
        if (creator) {
          if (body.chatId && !await member(actor, body.chatId)) return deny(res);
          req.body = responsibleIdsOnly(body);
          return next();
        }
        const target = agendaPath[2] || body.telegramId || body.senderId || req.query.telegramId;
        const paymentOnly = agendaPath[2] || (Object.hasOwn(body, "isPaid") && Object.keys(body).every((k) => ["isPaid", "telegramId", "senderId"].includes(k)));
        if (!paymentOnly || !equal(target, actor)) return deny(res);
        const responsible = await query(`SELECT 1 FROM agenda_payment_members
          WHERE agenda_payment_id = $1 AND user_id = $2 AND is_responsible = TRUE`, [agendaPath[1], user.id]);
        return allow(responsible.rowCount > 0);
      }
    }
    // Management of users, banks, installations, and unrecognized API paths is admin-only.
    return deny(res);
  };
}
