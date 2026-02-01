import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

  // 1. Identification: Search user by whatsappPhone
  const user = await prisma.user.findFirst({
    where: { whatsappPhone: item.sender }
  });

  if (!user) {
    console.warn(`[WhatsApp] Ignoring message from unknown sender: ${item.sender}`);
    return;
  }

  try {
      // 2. Extraction Strategy: Gemini 2.0 Flash
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let extractedData: any = null;

      try {
           const prompt = `Extract transaction data from this text: "${item.text}". Return JSON with keys: "description" (string), "amount" (number), "date" (ISOString, use today if missing), "status" (PAID or PENDING), "cardName" (string or null), "category" (string, choose best fit from: Food, Transport, Shopping, Services, Entertainment, Health, Home, Travel, Education, or Uncategorized), "isInstallment" (boolean), "totalInstallments" (number, default 1). If "em X vezes" or "X parcelas" is mentioned, isInstallment=true and totalInstallments=X. Return ONLY the JSON object.`;

           const result = await ai.models.generateContent({
               model: 'gemini-2.5-flash',
               contents: [{ parts: [{ text: prompt }] }]
           });

           const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
           if (text) {
               const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
               extractedData = JSON.parse(clean);
           }
      } catch (e) {
           console.error("AI Extraction failed", e);
      }

      if (extractedData && extractedData.amount && extractedData.description) {
          const amount = Math.abs(extractedData.amount);
          const description = extractedData.description;
          const status = extractedData.status || 'PENDING';
          const date = extractedData.date ? new Date(extractedData.date) : new Date();
          const category = extractedData.category || 'Uncategorized';
          const isInstallment = extractedData.isInstallment || false;
          const totalInstallments = extractedData.totalInstallments || 1;

          // Find card if specified
          let cardId = null;
          if (extractedData.cardName) {
              const card = await prisma.card.findFirst({
                  where: {
                      userId: user.id,
                      name: { contains: extractedData.cardName }
                  }
              });
              if (card) cardId = card.id;
          }

          const transactionsToCreate = [];

          if (isInstallment && totalInstallments > 1) {
              const groupId = uuidv4();
              const partAmount = Number((amount / totalInstallments).toFixed(2));
              const totalCalculated = partAmount * totalInstallments;
              const remainder = Number((amount - totalCalculated).toFixed(2));

              for (let i = 0; i < totalInstallments; i++) {
                  const installmentDate = new Date(date);
                  installmentDate.setMonth(date.getMonth() + i);

                  const thisAmount = (i === 0) ? partAmount + remainder : partAmount;
                  const thisStatus = (i === 0) ? status : 'PENDING';

                  transactionsToCreate.push({
                      userId: user.id,
                      description: `${description} (${i + 1}/${totalInstallments})`,
                      amount: thisAmount,
                      date: installmentDate,
                      type: 'EXPENSE',
                      status: thisStatus,
                      category: category,
                      cardId: cardId,
                      isInstallment: true,
                      installmentId: groupId,
                      installmentNumber: i + 1,
                      totalInstallments: totalInstallments
                  });
              }
          } else {
              transactionsToCreate.push({
                  userId: user.id,
                  description: description,
                  amount: amount,
                  date: date,
                  type: 'EXPENSE',
                  status: status,
                  category: category,
                  cardId: cardId,
                  isInstallment: false
              });
          }

          if (transactionsToCreate.length > 0) {
              await prisma.transaction.createMany({ data: transactionsToCreate });
              console.log(`[WhatsApp] ${transactionsToCreate.length} transações criadas para o usuário ${user.name}`);
          }
      } else {
          console.warn('Could not extract valid transaction data from message.');
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
