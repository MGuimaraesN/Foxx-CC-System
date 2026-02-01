import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const cardSchema = z.object({
  name: z.string(),
  last4Digits: z.string().length(4),
  limit: z.number(),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
  color: z.string(),
});

export const getCards = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.user.id }
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

export const createCard = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = cardSchema.parse(req.body);
    const card = await prisma.card.create({
      data: {
        ...data,
        userId: req.user.id
      }
    });
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const updateCard = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
       return res.status(404).json({ error: 'Card not found' });
    }

    const data = cardSchema.partial().parse(req.body);
    const card = await prisma.card.update({
      where: { id },
      data
    });
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const deleteCard = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
      const existing = await prisma.card.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.user.id) {
         return res.status(404).json({ error: 'Card not found' });
      }

      await prisma.card.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  };
