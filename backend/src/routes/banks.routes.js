import { Router } from "express";
import * as banksController from "../controllers/banks.controller.js";

const router = Router();

router.get("/", banksController.getBanks);
router.get("/:id", banksController.getBankById);
router.post("/", banksController.createBank);
router.patch("/:id", banksController.updateBank);

export default router;
