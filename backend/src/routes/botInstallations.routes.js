import { Router } from "express";
import {
  getByTelegramChatId,
  list,
  listTopics,
  upsert,
  upsertTopic,
} from "../controllers/botInstallations.controller.js";

const router = Router();

router.post("/upsert", upsert);
router.get("/", list);
router.post("/topics/upsert", upsertTopic);
router.get("/:telegramChatId", getByTelegramChatId);
router.get("/:telegramChatId/topics", listTopics);

export default router;
