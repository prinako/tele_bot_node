import { Router } from 'express';
import { create, getById, list, listByUser, patch, remove } from '../controllers/agenda.controller.js';

const router = Router();

router.post('/api/agenda', create);
router.get('/api/agenda', list);
router.get('/api/agenda/user/:telegramId', listByUser);
router.get('/api/agenda/:id', getById);
router.patch('/api/agenda/:id', patch);
router.delete('/api/agenda/:id', remove);

export default router;
