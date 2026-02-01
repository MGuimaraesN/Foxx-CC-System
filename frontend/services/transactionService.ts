import { Transaction, CreditCard, DashboardStats, Budget, BudgetUsage } from '../types';
import api from './api';

// --- CURRENCY LOGIC ---
export const getUSDRate = async (): Promise<number> => {
    // Keep local caching for this external API if desired,
    // or move to backend. For now, let's keep it simple or use a fixed rate fallback.
    return 5.5;
};

// --- TRANSACTION LOGIC ---
export const createTransaction = async (data: Partial<Transaction>): Promise<Transaction[]> => {
  const response = await api.post('/transactions', data);
  return [];
};

export const createBulkTransactions = async (data: Partial<Transaction>[]): Promise<number> => {
  const response = await api.post('/transactions/bulk', data);
  return response.data.count;
};

export const updateTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
  const response = await api.put(`/transactions/${data.id}`, data);
  return response.data;
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get('/transactions');
  // Dates come as strings from API (ISO), matching interface
  return response.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(`/transactions/${id}`);
};

// --- INTELLIGENT DASHBOARD STATS ---
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const fetchCards = async (): Promise<CreditCard[]> => {
  const response = await api.get('/cards');
  return response.data;
};

export const createCard = async (cardData: Omit<CreditCard, 'id'>): Promise<CreditCard> => {
  const response = await api.post('/cards', cardData);
  return response.data;
};

export const updateCard = async (cardData: CreditCard): Promise<CreditCard> => {
  const response = await api.put(`/cards/${cardData.id}`, cardData);
  return response.data;
};

// --- BUDGETS ---
export const fetchBudgets = async (): Promise<BudgetUsage[]> => {
  const response = await api.get('/budgets');
  return response.data;
};

export const createBudget = async (budget: Partial<Budget>): Promise<Budget> => {
  const response = await api.post('/budgets', budget);
  return response.data;
};

export const deleteBudget = async (id: string): Promise<void> => {
  await api.delete(`/budgets/${id}`);
};

// --- IMPORTS ---
// Keep import logic purely frontend for parsing, then batch create via API loop
// (or create a bulk import endpoint later)

export const parseOFX = (ofxContent: string): any[] => {
  const transactions: any[] = [];
  const bankTranListMatch = ofxContent.match(/<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/);
  if (!bankTranListMatch) return transactions;

  const content = bankTranListMatch[1];
  const entries = content.split('</STMTTRN>');

  entries.forEach(entry => {
     const amountMatch = entry.match(/<TRNAMT>([\d\.\-]+)/);
     const dateMatch = entry.match(/<DTPOSTED>(\d+)/);
     const memoMatch = entry.match(/<MEMO>(.*?)(\r|\n|<)/);

     if (dateMatch && amountMatch) {
       const rawDate = dateMatch[1];
       const dateStr = `${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}`;
       const description = memoMatch ? memoMatch[1].trim() : 'OFX Import';

       transactions.push({
         date: dateStr,
         amount: parseFloat(amountMatch[1]),
         description: description,
         // category: categorizeByDescription(description), // Helper needed?
         type: parseFloat(amountMatch[1]) < 0 ? 'EXPENSE' : 'INCOME'
       });
     }
  });

  return transactions;
};

export const importTransactionsFromCSV = async (csvText: string): Promise<number> => {
  const lines = csvText.split('\n');
  const transactions: Partial<Transaction>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 3) {
      const date = parts[0].trim();
      const desc = parts[1].trim();
      const amount = parseFloat(parts[2].trim());
      const category = parts[3]?.trim() || 'Uncategorized';

      if (!isNaN(amount) && desc) {
        const type = amount < 0 ? 'EXPENSE' : 'INCOME';
        transactions.push({
          description: desc,
          amount: Math.abs(amount),
          date: new Date(date).toISOString(),
          type: type as any,
          status: type === 'INCOME' ? 'PAID' : 'PENDING',
          category: category,
          tags: ['Imported'],
          isRecurring: false,
          isInstallment: false
        });
      }
    }
  }

  if (transactions.length > 0) {
      return await createBulkTransactions(transactions);
  }
  return 0;
};

export const importTransactionsFromOFX = async (ofxText: string): Promise<number> => {
  const parsed = parseOFX(ofxText);
  const transactions: Partial<Transaction>[] = parsed.map(t => ({
      description: t.description,
      amount: Math.abs(t.amount),
      date: new Date(t.date).toISOString(),
      type: t.amount < 0 ? 'EXPENSE' : 'INCOME',
      status: 'PAID',
      category: t.category || 'Uncategorized',
      tags: ['OFX Import'],
      isRecurring: false,
      isInstallment: false
  }));

  if (transactions.length > 0) {
      return await createBulkTransactions(transactions);
  }
  return 0;
};
