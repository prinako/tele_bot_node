import * as agendaService from "../services/agenda.service.js";

async function create(req, res, next) {
  try {
    const agenda = await agendaService.createAgendaPayment(req.body);
    if (agenda?.error) {
      return res.status(agenda.status || 400).json({
        error: agenda.error,
      });
    }

    if (!agenda) {
      return res.status(400).json({
        error: "Agenda payment could not be created",
      });
    }

    return res.status(201).json(agenda);
  } catch (error) {
    return next(error);
  }
}

async function list(_req, res, next) {
  try {
    res.json(await agendaService.getAllAgendaPayments());
  } catch (error) {
    next(error);
  }
}

async function listByUser(req, res, next) {
  try {
    res.json(
      await agendaService.getAgendaPaymentsByUser(req.params.telegramId),
    );
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const agenda = await agendaService.getAgendaPayment(req.params.id);
    if (!agenda) {
      return res.status(404).json({ error: "Agenda payment not found" });
    }

    return res.json(agenda);
  } catch (error) {
    return next(error);
  }
}

async function patch(req, res, next) {
  try {
    const telegramId = req.body.telegramId || req.query.telegramId || null;
    const agenda = await agendaService.updateAgenda(
      req.params.id,
      req.body,
      telegramId,
    );
    if (!agenda) {
      return res.status(404).json({ error: "Agenda payment not found" });
    }

    return res.json(agenda);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const agenda = await agendaService.deleteAgenda(req.params.id);
    if (!agenda) {
      return res.status(404).json({ error: "Agenda payment not found" });
    }

    return res.json(agenda);
  } catch (error) {
    return next(error);
  }
}

export { create, getById, list, listByUser, patch, remove };
