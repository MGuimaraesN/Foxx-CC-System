import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional().nullable(), // ISO date string
});

export const getGoals = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = goalSchema.parse(req.body);
    const goal = await prisma.goal.create({
      data: {
        userId: req.user.id,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || 0,
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
    });
    res.json(goal);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params as { id: string };

  try {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const data = goalSchema.partial().parse(req.body);
    const updated = await prisma.goal.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : (data.deadline === null ? null : undefined)
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params as { id: string };

  try {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id } });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};
