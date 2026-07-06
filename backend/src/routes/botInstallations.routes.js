import { Router } from "express";
import {
  getByTelegramChatId,
  list,
  listTopics,
  listUsers,
  upsert,
  upsertTopic,
  upsertUser,
} from "../controllers/botInstallations.controller.js";

const router = Router();

router.post("/upsert", upsert);
router.get("/", list);
router.post("/topics/upsert", upsertTopic);
router.post("/users/upsert", upsertUser);
router.get("/:telegramChatId/users", listUsers);
router.get("/:telegramChatId/topics", listTopics);
router.get("/:telegramChatId", getByTelegramChatId);

export default router;
