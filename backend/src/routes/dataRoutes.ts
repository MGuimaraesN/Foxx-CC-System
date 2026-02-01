import { Router } from 'express';
import { exportData, importData } from '../controllers/dataController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/export', exportData);
router.post('/import', importData);

export default router;
