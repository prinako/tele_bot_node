import * as pixService from '../services/pix.service.js';

async function create(req, res, next) {
    try {
        const result = await pixService.registerPix(req.body);
        if (result?.error) {
            return res.status(result.returnData?.code === '23505' ? 409 : 400).json({
                error: 'PIX could not be registered',
                details: result.returnData?.message,
                code: result.returnData?.code,
            });
        }

        return res.status(201).json(result.returnData);
    } catch (error) {
        return next(error);
    }
}

async function list(req, res, next) {
    try {
        const { senderId, bank } = req.query;
        if (!senderId || !bank) {
            return res.status(400).json({ error: 'senderId and bank are required' });
        }

        return res.json(await pixService.getPixBySenderBank(senderId, bank));
    } catch (error) {
        return next(error);
    }
}

async function patch(req, res, next) {
    try {
        const result = await pixService.updatePixKey(req.params.id, req.body);
        if (!result) {
            return res.status(404).json({ error: 'PIX key not found' });
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

export {
    create,
    list,
    patch,
};
