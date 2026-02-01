import { Router } from 'express';
import { getTransactions, createTransaction, deleteTransaction, updateTransaction, createBulkTransactions, bulkUpdateStatus, bulkDeleteTransactions } from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/bulk', createBulkTransactions);
router.patch('/bulk-status', bulkUpdateStatus);
router.post('/bulk-delete', bulkDeleteTransactions);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
