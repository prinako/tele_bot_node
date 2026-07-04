import * as paymentMembersService from '../services/paymentMembers.service.js';

async function list(req, res, next) {
    try {
        const members = await paymentMembersService.getMembers(req.params.id);
        if (!members) {
            return res.status(404).json({ error: 'Agenda payment not found' });
        }

        return res.json(members);
    } catch (error) {
        return next(error);
    }
}

async function paid(req, res, next) {
    try {
        const agenda = await paymentMembersService.markPaid(req.params.id, req.params.telegramId);
        if (!agenda) {
            return res.status(404).json({ error: 'Agenda payment member not found' });
        }

        return res.json(agenda);
    } catch (error) {
        return next(error);
    }
}

async function unpaid(req, res, next) {
    try {
        const agenda = await paymentMembersService.markUnpaid(req.params.id, req.params.telegramId);
        if (!agenda) {
            return res.status(404).json({ error: 'Agenda payment member not found' });
        }

        return res.json(agenda);
    } catch (error) {
        return next(error);
    }
}

export {
    list,
    paid,
    unpaid,
};
