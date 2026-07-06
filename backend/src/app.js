import express from "express";
import cors from "cors";

import adminRoutes from "./routes/admin.routes.js";
import agendaRoutes from "./routes/agenda.routes.js";
import banksRoutes from "./routes/banks.routes.js";
import healthRoutes from "./routes/health.routes.js";
import paymentMembersRoutes from "./routes/paymentMembers.routes.js";
import pixRoutes from "./routes/pix.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { error as logError } from "./utils/logger.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use(adminRoutes);
app.use("/api/banks", banksRoutes);
app.use(usersRoutes);
app.use(pixRoutes);
app.use(agendaRoutes);
app.use(paymentMembersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  logError(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

export default app;
