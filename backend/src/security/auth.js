import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE = "telebot_session";
const TTL = 60 * 60 * 1000;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
const fail = (res, status, error) => res.status(status).json({ error });

export function validateSecurityConfig(config) {
  if (!config.botApiToken || config.botApiToken.length < 32) {
    throw new Error("BOT_API_TOKEN must contain at least 32 characters");
  }
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.adminPasswordHash || "")) {
    throw new Error("ADMIN_PASSWORD_HASH must be generated with backend/scripts/hash-password.js");
  }
  if (!config.corsOrigins?.length || config.corsOrigins.some((origin) => {
    try { return new URL(origin).origin !== origin; } catch { return true; }
  })) throw new Error("CORS_ORIGINS must contain exact browser origins");
  if (config.nodeEnv === "production" && (!config.cookieSecure || config.corsOrigins.some((o) => !o.startsWith("https://")))) {
    throw new Error("Production requires HTTPS CORS_ORIGINS and COOKIE_SECURE=true");
  }
}

export function createAuthentication(config, { now = Date.now } = {}) {
  const sessions = new Map();
  const attempts = new Map();
  const cookieOptions = { httpOnly: true, secure: config.cookieSecure, sameSite: "strict", path: "/api" };
  const trustedOrigin = (req) => config.corsOrigins.includes(req.get("Origin"));
  function prune(map) {
    for (const [key, value] of map) if (value.expires <= now()) map.delete(key);
  }
  function session(req) {
    const token = req.get("Cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = digest(token);
    const value = sessions.get(key);
    if (!value || value.expires <= now()) { sessions.delete(key); return null; }
    return key;
  }
  async function login(req, res) {
    res.set("Cache-Control", "no-store");
    if (!trustedOrigin(req)) return fail(res, 403, "Origin not allowed");
    prune(attempts);
    const key = req.ip;
    if (!attempts.has(key)) {
      if (attempts.size >= 1000) return fail(res, 429, "Try again later");
      attempts.set(key, { count: 0, expires: now() + 60000 });
    }
    const attempt = attempts.get(key);
    if (++attempt.count > 10) { res.set("Retry-After", "60"); return fail(res, 429, "Too many login attempts"); }
    const password = req.body?.password;
    if (typeof password !== "string" || password.length > 1024) return fail(res, 401, "Invalid credentials");
    const [salt, hash] = (config.adminPasswordHash || "").split(":");
    if (!salt || !hash) return fail(res, 503, "Authentication unavailable");
    const derived = await scrypt(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length || !timingSafeEqual(expected, derived)) return fail(res, 401, "Invalid credentials");
    prune(sessions);
    if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString("hex");
    sessions.set(digest(token), { expires: now() + TTL });
    const previous = session(req);
    if (previous) sessions.delete(previous);
    res.cookie(COOKIE, token, { ...cookieOptions, maxAge: TTL });
    return res.json({ role: "admin" });
  }
  function authenticate(req, res, next) {
    res.set("Cache-Control", "no-store");
    const authorization = req.get("Authorization");
    if (authorization) {
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!config.botApiToken || !token || !same(token, config.botApiToken)) return fail(res, 401, "Invalid service credential");
      req.auth = { role: "service", telegramId: req.get("X-Telegram-User-Id") || null };
      if (req.auth.telegramId && !/^[1-9]\d{0,15}$/.test(req.auth.telegramId)) return fail(res, 400, "Invalid Telegram identity");
      return next();
    }
    if (!session(req)) return fail(res, 401, "Authentication required");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !trustedOrigin(req)) return fail(res, 403, "Origin not allowed");
    req.auth = { role: "admin" };
    next();
  }
  function logout(req, res) {
    if (req.auth.role !== "admin") return fail(res, 403, "Admin session required");
    sessions.delete(session(req));
    res.clearCookie(COOKIE, cookieOptions);
    res.status(204).end();
  }
  return { login, authenticate, logout };
}
