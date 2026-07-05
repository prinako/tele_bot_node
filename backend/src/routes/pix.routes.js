import { Router } from "express";
import { create, list, patch } from "../controllers/pix.controller.js";

const router = Router();

router.post("/api/pix", create);
router.get("/api/pix", list);
router.patch("/api/pix/:id", patch);

export default router;
