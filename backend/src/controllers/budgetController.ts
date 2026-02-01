import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const budgetSchema = z.object({
  category: z.string(),
  amount: z.number(),
  period: z.string().default('MONTHLY'),
});

export const getBudgets = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.id }
    });

    // Calculate usage
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const usage = await Promise.all(budgets.map(async (b) => {
        const spentAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId: req.user!.id,
                category: b.category,
                type: 'EXPENSE',
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });
        const spent = spentAgg._sum.amount || 0;
        return {
            ...b,
            spent,
            remaining: b.amount - spent,
            percentage: Math.min(100, (spent / b.amount) * 100)
        };
    }));

    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = budgetSchema.parse(req.body);
    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId: req.user.id
      }
    });
    res.json(budget);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params as { id: string };

    try {
      const existing = await prisma.budget.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.user.id) {
         return res.status(404).json({ error: 'Budget not found' });
      }

      await prisma.budget.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete' });
    }
};
