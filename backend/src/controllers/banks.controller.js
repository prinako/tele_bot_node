import * as banksService from "../services/banks.service.js";

async function getBanks(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const banks = includeInactive
      ? await banksService.getAllBanks()
      : await banksService.getActiveBanks();

    return res.json(banks);
  } catch (error) {
    return next(error);
  }
}

async function getBankById(req, res, next) {
  try {
    const bank = await banksService.getBankById(req.params.id);
    if (!bank) {
      return res.status(404).json({ error: "Bank not found" });
    }

    return res.json(bank);
  } catch (error) {
    return next(error);
  }
}

async function createBank(req, res, next) {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: "name is required" });
    }

    const existingBank = await banksService.getBankByName(req.body.name);
    if (existingBank) {
      return res.status(409).json({ error: "Bank already exists" });
    }

    const bank = await banksService.createBank(req.body);
    return res.status(201).json(bank);
  } catch (error) {
    return next(error);
  }
}

async function updateBank(req, res, next) {
  try {
    const bank = await banksService.updateBank(req.params.id, req.body);
    if (!bank) {
      return res.status(404).json({ error: "Bank not found" });
    }

    return res.json(bank);
  } catch (error) {
    return next(error);
  }
}

export { createBank, getBankById, getBanks, updateBank };
