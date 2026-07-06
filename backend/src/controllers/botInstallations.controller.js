import * as botInstallationsService from "../services/botInstallations.service.js";

async function upsert(req, res, next) {
  try {
    const installation = await botInstallationsService.upsertInstallation(
      req.body,
    );
    res.status(201).json(installation);
  } catch (error) {
    next(error);
  }
}

async function list(_req, res, next) {
  try {
    res.json(await botInstallationsService.listInstallations());
  } catch (error) {
    next(error);
  }
}

async function getByTelegramChatId(req, res, next) {
  try {
    const installation = await botInstallationsService.getInstallation(
      req.params.telegramChatId,
    );
    if (!installation) {
      return res.status(404).json({ error: "Bot installation not found" });
    }

    return res.json(installation);
  } catch (error) {
    return next(error);
  }
}

async function upsertTopic(req, res, next) {
  try {
    const topic = await botInstallationsService.upsertTopic(req.body);
    res.status(201).json(topic);
  } catch (error) {
    next(error);
  }
}

async function listTopics(req, res, next) {
  try {
    const topics = await botInstallationsService.listTopics(
      req.params.telegramChatId,
    );
    if (!topics) {
      return res.status(404).json({ error: "Bot installation not found" });
    }

    return res.json(topics);
  } catch (error) {
    return next(error);
  }
}

async function upsertUser(req, res, next) {
  try {
    const installationUser = await botInstallationsService
      .upsertInstallationUser(req.body);
    res.status(201).json(installationUser);
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await botInstallationsService.listUsers(
      req.params.telegramChatId,
    );
    if (!users) {
      return res.status(404).json({ error: "Bot installation not found" });
    }

    return res.json(users);
  } catch (error) {
    return next(error);
  }
}

async function patchTopicSettings(req, res, next) {
  try {
    const installation = await botInstallationsService.updateTopicSettings(
      req.params.telegramChatId,
      req.body,
    );

    return res.json(installation);
  } catch (error) {
    return next(error);
  }
}

export {
  getByTelegramChatId,
  list,
  listTopics,
  listUsers,
  patchTopicSettings,
  upsert,
  upsertTopic,
  upsertUser,
};
