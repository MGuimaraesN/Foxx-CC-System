import { Router } from 'express';
import { register, login, me, updateSettings } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.patch('/settings', authenticate, updateSettings);

export default router;
