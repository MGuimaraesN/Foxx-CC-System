import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const transactionSchema = z.object({
  description: z.string(),
  amount: z.number(),
  date: z.string(), // ISO date string
  type: z.enum(['INCOME', 'EXPENSE']),
  status: z.enum(['PAID', 'PENDING']),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  cardId: z.string().optional(),

  isInstallment: z.boolean().optional(),
  installmentNumber: z.number().optional(),
  totalInstallments: z.number().optional(),

  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
});

export const getTransactions = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      include: { card: true } // Include card details if needed
    });

    // Convert tags string back to array for frontend compatibility if needed,
    // or frontend expects string?
    // Types.ts says `tags: string[]`. Schema says `tags: String?`.
    // I should convert.
    const formatted = transactions.map(t => ({
      ...t,
      tags: t.tags ? t.tags.split(',') : [],
      date: t.date.toISOString(),
      createdAt: undefined // Hide internal fields if necessary
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = transactionSchema.parse(req.body);
    const userId = req.user.id;
    const baseDate = new Date(data.date);
    const groupId = uuidv4(); // Generate a common ID for grouped transactions

    const transactionsToCreate: any[] = [];
    const tagsStr = data.tags ? data.tags.join(',') : null;

    // Installment Logic
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1 && data.type === 'EXPENSE') {
      const totalAmount = data.amount;
      const partAmount = Number((totalAmount / data.totalInstallments).toFixed(2));
      const totalCalculated = partAmount * data.totalInstallments;
      const remainder = Number((totalAmount - totalCalculated).toFixed(2));
      const currentInstallment = data.installmentNumber || 1;

      const countToGenerate = data.totalInstallments - currentInstallment + 1;

      for (let i = 0; i < countToGenerate; i++) {
        const thisInstallmentNum = currentInstallment + i;
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);

        // Add remainder to first installment
        const amount = (thisInstallmentNum === 1) ? partAmount + remainder : partAmount;

        // Status: First one takes provided status, others usually PENDING?
        // Logic from frontend: `status: i === 0 ? defaultStatus : TransactionStatus.PENDING`
        const status = (i === 0) ? data.status : 'PENDING';

        transactionsToCreate.push({
          userId,
          description: data.description,
          amount,
          date: installmentDate,
          type: data.type,
          status,
          category: data.category,
          tags: tagsStr,
          cardId: data.cardId || null,
          isInstallment: true,
          installmentId: groupId,
          installmentNumber: thisInstallmentNum,
          totalInstallments: data.totalInstallments,
          isRecurring: false
        });
      }
    }
    // Recurring Logic
    else if (data.isRecurring) {
      const recurrenceCount = 6; // Default to 6 months if not specified/endless logic not fully implemented
      // Or use recurrenceEndDate if present
      let count = recurrenceCount;
      if (data.recurrenceEndDate) {
          // Calculate months between
          // For simplicity, stick to fixed count or date check.
          // Frontend logic: `if (data.recurrenceEndDate && recurringDate > new Date(data.recurrenceEndDate)) break;`
      }

      for (let i = 0; i < count; i++) {
        const recurringDate = new Date(baseDate);
        const frequency = data.recurrenceFrequency || 'MONTHLY';

        if (frequency === 'MONTHLY') recurringDate.setMonth(baseDate.getMonth() + i);
        else if (frequency === 'WEEKLY') recurringDate.setDate(baseDate.getDate() + (i * 7));
        else if (frequency === 'YEARLY') recurringDate.setFullYear(baseDate.getFullYear() + i);

        if (data.recurrenceEndDate && recurringDate > new Date(data.recurrenceEndDate)) break;

        transactionsToCreate.push({
          userId,
          description: data.description,
          amount: data.amount,
          date: recurringDate,
          type: data.type,
          status: i === 0 ? data.status : 'PENDING',
          category: data.category,
          tags: tagsStr,
          cardId: data.cardId || null,
          isRecurring: true,
          recurrenceFrequency: frequency,
          recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
          isInstallment: false
        });
      }
    }
    // Single Transaction
    else {
      transactionsToCreate.push({
        userId,
        description: data.description,
        amount: data.amount,
        date: baseDate,
        type: data.type,
        status: data.status,
        category: data.category,
        tags: tagsStr,
        cardId: data.cardId || null,
        isInstallment: false,
        isRecurring: false
      });
    }

    // Batch create
    // SQLite doesn't support createMany nicely with limitations in some versions, but Prisma supports it.
    // However, createMany doesn't return created records in some DBs.
    // We can use $transaction with create.

    // For simplicity with SQLite/Prisma, let's use a loop or createMany if supported.
    // Prisma createMany is supported for SQLite.

    await prisma.transaction.createMany({
      data: transactionsToCreate
    });

    res.json({ message: 'Transactions created', count: transactionsToCreate.length });

  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        // Verify ownership
        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        await prisma.transaction.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Just basic update for now, complicated if editing installment logic
        const data = req.body;
        // Map body to prisma fields
        const updateData: any = { ...data };
        if (data.tags && Array.isArray(data.tags)) {
            updateData.tags = data.tags.join(',');
        }
        if (data.date) updateData.date = new Date(data.date);

        // Remove fields that shouldn't be updated loosely or map them carefully
        delete updateData.id;
        delete updateData.userId;
        delete updateData.createdAt;

        const updated = await prisma.transaction.update({
            where: { id },
            data: updateData
        });

        res.json({
            ...updated,
            tags: updated.tags ? updated.tags.split(',') : []
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
};
