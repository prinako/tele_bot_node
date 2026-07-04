import * as usersService from '../services/users.service.js';

async function upsert(req, res, next) {
    try {
        const user = await usersService.upsertUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
}

async function allowed(_req, res, next) {
    try {
        res.json(await usersService.getAllowedUsers());
    } catch (error) {
        next(error);
    }
}

async function getByTelegramId(req, res, next) {
    try {
        const user = await usersService.getUser(req.params.telegramId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user);
    } catch (error) {
        return next(error);
    }
}

export {
    allowed,
    getByTelegramId,
    upsert,
};
