import { Router } from "express";
import { agenda, pix, stats } from "../controllers/admin.controller.js";

const router = Router();

router.get("/api/admin/stats", stats);
router.get("/api/admin/pix", pix);
router.get("/api/admin/agenda", agenda);

export default router;
