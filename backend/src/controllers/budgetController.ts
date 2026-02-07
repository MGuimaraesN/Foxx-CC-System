import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

const budgetSchema = z.object({
  category: z.string(),
  tag: z.string().optional(),
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
        const whereClause: any = {
            userId: req.user!.id,
            category: b.category,
            type: 'EXPENSE',
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        };

        if (b.tag) {
            // Improve robustness: 'tag' could be a substring of another tag.
            // Ideally use exact match if tags are single, or comma-delimiters.
            // For now, contains is the best simple Prisma filter without raw SQL.
            // But we can filter in memory for strict correctness if needed, or rely on distinct naming.
            whereClause.tags = { contains: b.tag };
        }

        const transactions = await prisma.transaction.findMany({
          where: whereClause,
          select: { amount: true, tags: true }
        });

        const spent = transactions.reduce((sum, t) => {
            // Strict check if tag is involved
            if (b.tag && t.tags) {
                const tagsArray = t.tags.split(',').map(tag => tag.trim());
                if (!tagsArray.includes(b.tag)) {
                    return sum;
                }
            }
            return sum + t.amount;
        }, 0);
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

export const updateBudget = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params as { id: string };

    try {
        const existing = await prisma.budget.findUnique({ where: { id } });
        if (!existing || existing.userId !== req.user.id) {
             return res.status(404).json({ error: 'Budget not found' });
        }

        const data = budgetSchema.partial().parse(req.body);
        const updated = await prisma.budget.update({
            where: { id },
            data
        });
        res.json(updated);
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
