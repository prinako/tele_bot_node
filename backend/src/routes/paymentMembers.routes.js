import { Router } from 'express';
import { list, paid, unpaid } from '../controllers/paymentMembers.controller.js';

const router = Router();

router.get('/api/agenda/:id/members', list);
router.patch('/api/agenda/:id/members/:telegramId/paid', paid);
router.patch('/api/agenda/:id/members/:telegramId/unpaid', unpaid);

export default router;
