import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

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
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { card: true }
    });

    const formatted = transactions.map(t => ({
      ...t,
      tags: t.tags ? t.tags.split(',') : [],
      date: t.date.toISOString(),
      createdAt: undefined
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
    const groupId = uuidv4();

    const transactionsToCreate: any[] = [];
    const tagsStr = data.tags ? data.tags.join(',') : null;

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

        const amount = (thisInstallmentNum === 1) ? partAmount + remainder : partAmount;
        const status = (i === 0) ? data.status : 'PENDING';

        transactionsToCreate.push({
          userId,
          description: `${data.description} (${thisInstallmentNum}/${data.totalInstallments})`,
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
    else if (data.isRecurring) {
      const recurrenceCount = 6;
      let count = recurrenceCount;

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
    const { id } = req.params as { id: string };
    const cascade = req.query.cascade === 'true';

    try {
        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (cascade && tx.isInstallment && tx.installmentId) {
            // Cascade delete future installments
            await prisma.transaction.updateMany({
                where: {
                    installmentId: tx.installmentId,
                    userId: req.user.id,
                    date: { gte: tx.date },
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });
            return res.json({ message: 'Deleted series' });
        }

        // Soft delete single
        await prisma.transaction.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params as { id: string };
    const cascade = req.query.cascade === 'true';

    try {
        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const data = req.body;
        const updateData: any = { ...data };
        if (data.tags && Array.isArray(data.tags)) {
            updateData.tags = data.tags.join(',');
        }
        if (data.date) updateData.date = new Date(data.date);

        delete updateData.id;
        delete updateData.userId;
        delete updateData.createdAt;

        // Installment Conversion Logic (Single -> Multi)
        if (!tx.isInstallment && updateData.isInstallment && updateData.totalInstallments && updateData.totalInstallments > 1) {
             const groupId = uuidv4();
             const totalInstallments = updateData.totalInstallments;
             const baseAmount = updateData.amount || tx.amount;
             const baseDate = updateData.date ? new Date(updateData.date) : tx.date;

             // Calculate splits
             const partAmount = Number((baseAmount / totalInstallments).toFixed(2));
             const totalCalculated = partAmount * totalInstallments;
             const remainder = Number((baseAmount - totalCalculated).toFixed(2));

             // Update the CURRENT transaction to be the first installment
             updateData.installmentId = groupId;
             updateData.installmentNumber = 1;
             updateData.totalInstallments = totalInstallments;
             updateData.amount = partAmount + remainder;
             updateData.description = `${updateData.description || tx.description} (1/${totalInstallments})`;

             // Create FUTURE installments
             const installments = [];
             for (let i = 1; i < totalInstallments; i++) {
                 const nextDate = new Date(baseDate);
                 nextDate.setMonth(baseDate.getMonth() + i);

                 installments.push({
                     userId: req.user.id,
                     description: `${updateData.description || tx.description} (${i + 1}/${totalInstallments})`,
                     amount: partAmount,
                     date: nextDate,
                     type: updateData.type || tx.type,
                     status: 'PENDING',
                     category: updateData.category || tx.category,
                     tags: updateData.tags || tx.tags,
                     cardId: updateData.cardId || tx.cardId,
                     isInstallment: true,
                     installmentId: groupId,
                     installmentNumber: i + 1,
                     totalInstallments: totalInstallments
                 });
             }
             await prisma.transaction.createMany({ data: installments });
        }
        else if (cascade && tx.isInstallment && tx.installmentId) {
            // Update future installments, but preserve specific fields like date and amount unless explicitly forced?
            // For now, we update category, description base (keeping number?), tags.
            // Complex logic: Update only shared fields.
            const { description, category, tags, type } = updateData;
            const sharedUpdate: any = {};
            if (category) sharedUpdate.category = category;
            if (tags) sharedUpdate.tags = tags;
            if (type) sharedUpdate.type = type;

            await prisma.transaction.updateMany({
                where: {
                    installmentId: tx.installmentId,
                    userId: req.user.id,
                    date: { gte: tx.date },
                    deletedAt: null
                },
                data: sharedUpdate
            });
        }

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

export const createBulkTransactions = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const transactions = req.body;
        if (!Array.isArray(transactions)) {
            return res.status(400).json({ error: 'Expected array of transactions' });
        }

        // Initialize Gemini
        let ai: GoogleGenAI | null = null;
        try {
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.warn('Gemini init failed', e);
        }

        // 1. Prepare Categorization Cache
        const incomingDescriptions = [...new Set(transactions.map((t: any) => t.description).filter((d: any) => d))];
        const categoryMap = new Map<string, string>();

        // Check DB for existing categorizations
        try {
            const existing = await prisma.transaction.findMany({
                where: {
                    userId: req.user.id,
                    description: { in: incomingDescriptions as string[] },
                    category: { not: 'Uncategorized' }
                },
                select: { description: true, category: true }
            });
            existing.forEach(t => categoryMap.set(t.description, t.category));
        } catch (e) {
            console.warn('Failed to fetch existing categories', e);
        }

        // Identify what still needs AI
        const needsAi = incomingDescriptions.filter(d => !categoryMap.has(d as string));

        // Batch AI Processing
        if (needsAi.length > 0 && ai) {
            const BATCH_SIZE = 20;
            for (let i = 0; i < needsAi.length; i += BATCH_SIZE) {
                const batch = needsAi.slice(i, i + BATCH_SIZE);
                try {
                     const prompt = `Categorize the following descriptions into single-word categories (e.g. Food, Transport, Shopping, Services, Entertainment, Health, Home, Travel, Education). Descriptions: ${JSON.stringify(batch)}. Return ONLY a JSON array of strings.`;

                     const result = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [{ parts: [{ text: prompt }] }]
                     });

                     const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                     if (text) {
                         const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                         const categories = JSON.parse(cleanText);
                         if (Array.isArray(categories) && categories.length === batch.length) {
                             batch.forEach((desc, idx) => {
                                 categoryMap.set(desc as string, categories[idx]);
                             });
                         }
                     }
                } catch (e) {
                    console.error("Gemini batch failed, proceeding with defaults", e);
                }
            }
        }

        const valid = transactions.map((t: any) => {
            if (!t.description || t.amount === undefined || !t.date) return null;

            let category = t.category;
            if (!category || category === 'Uncategorized') {
                category = categoryMap.get(t.description) || 'Uncategorized';
            }

            return {
                userId: req.user!.id,
                description: t.description,
                amount: Number(t.amount),
                date: new Date(t.date),
                type: t.type || (t.amount < 0 ? 'EXPENSE' : 'INCOME'),
                status: t.status || 'PAID',
                category: category,
                tags: Array.isArray(t.tags) ? t.tags.join(',') : (t.tags || null),
                cardId: t.cardId || null,
                isInstallment: false,
                isRecurring: false
            };
        }).filter((t: any) => t !== null);

        if (valid.length > 0) {
            await prisma.transaction.createMany({ data: valid as any });
        }

        res.json({ count: valid.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to bulk create' });
    }
};

export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || !['PAID', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    try {
        await prisma.transaction.updateMany({
            where: {
                id: { in: ids },
                userId: req.user.id,
                deletedAt: null
            },
            data: { status }
        });
        res.json({ message: 'Updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
};

export const bulkDeleteTransactions = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    try {
        await prisma.transaction.updateMany({
            where: {
                id: { in: ids },
                userId: req.user.id,
                deletedAt: null
            },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
};
