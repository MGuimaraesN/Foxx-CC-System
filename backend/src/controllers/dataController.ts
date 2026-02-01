import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { GoogleGenAI } from '@google/genai';

// --- WhatsApp Queue System ---
interface QueueItem {
  text: string;
  sender: string; // Phone number or ID
}

const messageQueue: QueueItem[] = [];
let isProcessing = false;

const processMessage = async (item: QueueItem) => {
  console.log('Processing WhatsApp message:', item.text);

  // 1. Identification: In a real app, map sender -> userId.
  // For this demo, we'll try to find the first user or a specific user.
  // We'll assume the "sender" might match a user field if we had one,
  // but for now let's just use the first user in DB as a fallback or mock it.
  const user = await prisma.user.findFirst();
  if (!user) return;

  try {
      // 2. Extraction Strategy: Regex First, then AI
      // Simple Regex: "R$ 50 Padaria" or "50 Padaria"
      const simpleRegex = /(?:R\$)?\s*(\d+(?:[.,]\d{2})?)\s+(.*)/i;
      const match = item.text.match(simpleRegex);

      let amount: number | null = null;
      let description: string | null = null;
      let cardName: string | null = null;

      if (match) {
          amount = parseFloat(match[1].replace(',', '.'));
          description = match[2].trim();
          // Check if description ends with a card name we know?
          // Skipping complex regex for card extraction for now.
      }

      // If regex failed or we want smarter extraction, use Gemini (rate limited)
      // Since we are in a 15s delayed queue, we can safely use Gemini.
      if (!amount || !description) {
           const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
           try {
               const prompt = `Extract transaction data from this text: "${item.text}". Return JSON with keys: "amount" (number), "description" (string), "cardName" (string or null). If invalid, return null.`;
               const result = await ai.models.generateContent({
                   model: 'gemini-2.0-flash',
                   contents: [{ parts: [{ text: prompt }] }]
               });
               const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
               if (text) {
                   const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
                   const data = JSON.parse(clean);
                   if (data && data.amount) {
                       amount = data.amount;
                       description = data.description;
                       cardName = data.cardName;
                   }
               }
           } catch (e) {
               console.error("AI Extraction failed", e);
           }
      }

      if (amount && description) {
          // Find card if specified
          let cardId = null;
          if (cardName) {
              const card = await prisma.card.findFirst({
                  where: { userId: user.id, name: { contains: cardName } }
              });
              if (card) cardId = card.id;
          }

          // Create Transaction
          await prisma.transaction.create({
              data: {
                  userId: user.id,
                  description: description,
                  amount: -Math.abs(amount), // Assume expense
                  date: new Date(),
                  type: 'EXPENSE',
                  status: 'PAID',
                  category: 'Uncategorized', // We could run categorization here too!
                  cardId: cardId
              }
          });
          console.log('Transaction created via WhatsApp');
      }

  } catch (error) {
      console.error('Error processing message item', error);
  }
};

const processQueue = async () => {
  if (messageQueue.length === 0) {
      isProcessing = false;
      return;
  }

  isProcessing = true;
  const item = messageQueue.shift();
  if (item) {
      await processMessage(item);
  }

  // 15 seconds delay between processing to respect Rate Limits
  setTimeout(processQueue, 15000);
};

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
    const { message, sender } = req.body;
    // Expecting generic webhook payload: { message: "...", sender: "..." }

    if (message) {
        messageQueue.push({ text: message, sender: sender || 'Unknown' });
        if (!isProcessing) {
            processQueue();
        }
    }

    res.json({ status: 'queued' });
};

export const exportData = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.id;

  try {
    const data = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cards: true,
        transactions: true,
        budgets: true
      }
    });

    if (!data) return res.status(404).json({ error: 'User not found' });

    // Sanitize user data (remove passwordHash)
    const { passwordHash, ...cleanData } = data;

    // Wrap in a structure similar to frontend expectance or just return the object
    const backup = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      user: cleanData,
      cards: cleanData.cards,
      transactions: cleanData.transactions,
      budgets: cleanData.budgets
    };

    res.json(backup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Export failed' });
  }
};

export const importData = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.id;
  const backup = req.body;

  if (!backup || !backup.user || !backup.transactions) {
      return res.status(400).json({ error: 'Invalid backup format' });
  }

  // Validate that the backup belongs to the same user email?
  // Or just overwrite current user's data with backup data (potentially mapping IDs?)
  // Requirement says: Delete current data, recreate based on JSON.
  // We should force the userId of the new records to be the current logged in user to avoid hijacking.

  try {
    await prisma.$transaction(async (tx) => {
        // 1. Delete existing data (respect FK constraints: Transaction/Budget -> Card -> User)
        // Usually Transactions depend on Cards.
        await tx.transaction.deleteMany({ where: { userId } });
        await tx.budget.deleteMany({ where: { userId } });
        await tx.card.deleteMany({ where: { userId } });

        // 2. Restore Cards
        // We need to map old IDs to new IDs if we want to be safe, OR just trust the UUIDs if they don't conflict globally.
        // If we are restoring to the SAME user, we can keep IDs if we deleted them.
        // But if importing to a new user, IDs might conflict if somehow duplicated (unlikely with UUID).
        // Let's reuse IDs from backup for simplicity to maintain relationships between Transaction->Card.

        const cardsToCreate = (backup.cards || []).map((c: any) => ({
            id: c.id,
            userId, // Force ownership
            name: c.name,
            last4Digits: c.last4Digits,
            limit: c.limit,
            closingDay: c.closingDay,
            dueDay: c.dueDay,
            color: c.color
        }));

        if (cardsToCreate.length > 0) {
            await tx.card.createMany({ data: cardsToCreate });
        }

        // 3. Restore Budgets
        const budgetsToCreate = (backup.budgets || []).map((b: any) => ({
            id: b.id,
            userId,
            category: b.category,
            amount: b.amount,
            period: b.period
        }));

        if (budgetsToCreate.length > 0) {
            await tx.budget.createMany({ data: budgetsToCreate });
        }

        // 4. Restore Transactions
        const transactionsToCreate = (backup.transactions || []).map((t: any) => ({
            id: t.id,
            userId,
            description: t.description,
            amount: t.amount,
            date: new Date(t.date), // Ensure Date type
            type: t.type,
            status: t.status,
            category: t.category,
            tags: t.tags, // Assuming string or null, handle array conversion if needed? DB is String.
            cardId: t.cardId,
            isInstallment: t.isInstallment,
            installmentId: t.installmentId,
            installmentNumber: t.installmentNumber,
            totalInstallments: t.totalInstallments,
            isRecurring: t.isRecurring,
            recurrenceFrequency: t.recurrenceFrequency,
            recurrenceEndDate: t.recurrenceEndDate ? new Date(t.recurrenceEndDate) : null
        }));

        if (transactionsToCreate.length > 0) {
             await tx.transaction.createMany({ data: transactionsToCreate });
        }
    });

    res.json({ message: 'Restore successful' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Import failed' });
  }
};
