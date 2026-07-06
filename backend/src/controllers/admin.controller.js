import * as adminService from "../services/admin.service.js";

async function stats(_req, res, next) {
  try {
    return res.json(await adminService.getStats());
  } catch (error) {
    return next(error);
  }
}

async function pix(_req, res, next) {
  try {
    return res.json(await adminService.getPixKeys());
  } catch (error) {
    return next(error);
  }
}

async function agenda(_req, res, next) {
  try {
    return res.json(await adminService.getAgendaPayments());
  } catch (error) {
    return next(error);
  }
}

export { agenda, pix, stats };
