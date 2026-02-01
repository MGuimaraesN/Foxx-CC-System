import { Router } from 'express';
import { getTransactions, createTransaction, deleteTransaction, updateTransaction, createBulkTransactions } from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/bulk', createBulkTransactions);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
