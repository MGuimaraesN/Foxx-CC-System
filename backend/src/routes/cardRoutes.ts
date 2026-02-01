import { Router } from 'express';
import { getCards, createCard, updateCard, deleteCard } from '../controllers/cardController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getCards);
router.post('/', createCard);
router.put('/:id', updateCard);
router.delete('/:id', deleteCard);

export default router;
