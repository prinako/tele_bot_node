import { Router } from 'express';
import { allowed, getByTelegramId, upsert } from '../controllers/users.controller.js';

const router = Router();

router.post('/api/users/upsert', upsert);
router.get('/api/users/allowed', allowed);
router.get('/api/users/:telegramId', getByTelegramId);

export default router;
