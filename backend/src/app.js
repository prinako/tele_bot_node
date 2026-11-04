import express from "express";
import cors from "cors";

import adminRoutes from "./routes/admin.routes.js";
import agendaRoutes from "./routes/agenda.routes.js";
import banksRoutes from "./routes/banks.routes.js";
import botInstallationsRoutes from "./routes/botInstallations.routes.js";
import healthRoutes from "./routes/health.routes.js";
import paymentMembersRoutes from "./routes/paymentMembers.routes.js";
import pixRoutes from "./routes/pix.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { error as logError } from "./utils/logger.js";

import env from "./config/env.js";
import { query } from "./db/postgres.js";
import { createAuthentication } from "./security/auth.js";
import { createAuthorization } from "./security/authorize.js";

export function createApp({ config = env, dbQuery = query, now } = {}) {
  const app = express();
  const authentication = createAuthentication(config, { now });
  app.disable("x-powered-by");

  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Telegram-User-Id"],
    optionsSuccessStatus: 204,
  }));
  app.use(express.json({ limit: "32kb" }));
  app.use(healthRoutes);
  app.post("/api/auth/login", authentication.login);
  app.use("/api", authentication.authenticate);
  app.post("/api/auth/logout", authentication.logout);
  const authorize = createAuthorization(dbQuery);
  app.use((req, res, next) => req.path.startsWith("/api/") ? authorize(req, res, next) : next());
  app.get("/api/auth/me", (req, res) => res.json({
    role: req.auth.role === "admin" || req.auth.user?.is_admin ? "admin" : "user",
    telegramId: req.auth.telegramId || null,
  }));

  app.use(adminRoutes);
  app.use("/api/banks", banksRoutes);
  app.use("/api/bot-installations", botInstallationsRoutes);
  app.use(usersRoutes);
  app.use(pixRoutes);
  app.use(agendaRoutes);
  app.use(paymentMembersRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  app.use((err, _req, res, _next) => {
    logError({ name: err.name, status: err.status || 500 });
    res.status(err.status || 500).json({
      error: err.status && err.status < 500 ? "Invalid request" : "Internal server error",
    });
  });

  return app;
}

export default createApp();
