import { Router } from "express";
import {
  allowed,
  getByTelegramId,
  list,
  listBotInstallations,
  patch,
  upsert,
} from "../controllers/users.controller.js";

const router = Router();

router.post("/api/users/upsert", upsert);
router.get("/api/users/allowed", allowed);
router.get("/api/users", list);
router.get(
  "/api/users/:telegramUserId/bot-installations",
  listBotInstallations,
);
router.get("/api/users/:telegramId", getByTelegramId);
router.patch("/api/users/:telegramId", patch);

export default router;
