"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransaction = exports.deleteTransaction = exports.createTransaction = exports.getTransactions = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const uuid_1 = require("uuid");
const transactionSchema = zod_1.z.object({
    description: zod_1.z.string(),
    amount: zod_1.z.number(),
    date: zod_1.z.string(), // ISO date string
    type: zod_1.z.enum(['INCOME', 'EXPENSE']),
    status: zod_1.z.enum(['PAID', 'PENDING']),
    category: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    cardId: zod_1.z.string().optional(),
    isInstallment: zod_1.z.boolean().optional(),
    installmentNumber: zod_1.z.number().optional(),
    totalInstallments: zod_1.z.number().optional(),
    isRecurring: zod_1.z.boolean().optional(),
    recurrenceFrequency: zod_1.z.string().optional(),
    recurrenceEndDate: zod_1.z.string().optional(),
});
const getTransactions = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const transactions = await prisma_1.default.transaction.findMany({
            where: { userId: req.user.id },
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
const createTransaction = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const data = transactionSchema.parse(req.body);
        const userId = req.user.id;
        const baseDate = new Date(data.date);
        const groupId = (0, uuid_1.v4)();
        const transactionsToCreate = [];
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
                    description: data.description,
                    amount,
                    date: installmentDate,
                    type: data.type,
                    status,
                    category: data.category,
                    // tags: tagsStr as any,
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
                if (frequency === 'MONTHLY')
                    recurringDate.setMonth(baseDate.getMonth() + i);
                else if (frequency === 'WEEKLY')
                    recurringDate.setDate(baseDate.getDate() + (i * 7));
                else if (frequency === 'YEARLY')
                    recurringDate.setFullYear(baseDate.getFullYear() + i);
                if (data.recurrenceEndDate && recurringDate > new Date(data.recurrenceEndDate))
                    break;
                transactionsToCreate.push({
                    userId,
                    description: data.description,
                    amount: data.amount,
                    date: recurringDate,
                    type: data.type,
                    status: i === 0 ? data.status : 'PENDING',
                    category: data.category,
                    // tags: tagsStr as any,
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
                // tags: tagsStr as any,
                cardId: data.cardId || null,
                isInstallment: false,
                isRecurring: false
            });
        }
        await prisma_1.default.transaction.createMany({
            data: transactionsToCreate
        });
        res.json({ message: 'Transactions created', count: transactionsToCreate.length });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid data' });
    }
};
exports.createTransaction = createTransaction;
const deleteTransaction = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
        const tx = await prisma_1.default.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        await prisma_1.default.transaction.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
};
exports.deleteTransaction = deleteTransaction;
const updateTransaction = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
        const tx = await prisma_1.default.transaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== req.user.id) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const data = req.body;
        const updateData = { ...data };
        if (data.tags && Array.isArray(data.tags)) {
            updateData.tags = data.tags.join(',');
        }
        if (data.date)
            updateData.date = new Date(data.date);
        delete updateData.id;
        delete updateData.userId;
        delete updateData.createdAt;
        const updated = await prisma_1.default.transaction.update({
            where: { id },
            data: updateData
        });
        res.json({
            ...updated,
            tags: updated.tags ? updated.tags.split(',') : []
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
};
exports.updateTransaction = updateTransaction;
