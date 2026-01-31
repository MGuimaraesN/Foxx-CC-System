import { Transaction, CreditCard, TransactionType, Currency, DashboardStats, Budget, BudgetUsage, RecurrenceFrequency, TransactionStatus, FinancialHealth } from '../types';

// Mock Data Stores
let MOCK_CARDS: CreditCard[] = [
  { id: 'c1', name: 'Nubank Platinum', last4Digits: '4242', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600' },
  { id: 'c2', name: 'XP Visa Infinite', last4Digits: '8811', limit: 50000, closingDay: 20, dueDay: 27, color: 'bg-slate-800' },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    description: 'AWS Infrastructure',
    amount: 602.50, // Converted to BRL approx
    currency: Currency.BRL,
    originalAmount: 120.50,
    originalCurrency: Currency.USD,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    cardId: 'c2',
    category: 'Infrastructure',
    tags: ['Cloud', 'DevOps'],
    isInstallment: false,
    isRecurring: true,
    recurrenceFrequency: RecurrenceFrequency.MONTHLY,
  },
  {
    id: 't2',
    description: 'MacBook Pro M3',
    amount: 12000, 
    currency: Currency.BRL,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PENDING,
    cardId: 'c1',
    category: 'Equipment',
    tags: ['Office'],
    isInstallment: true,
    installmentId: 'inst_1',
    installmentNumber: 1,
    totalInstallments: 10,
    isRecurring: false,
  },
];

const STORAGE_KEY_TRANSACTIONS = 'cc_expense_transactions';
const STORAGE_KEY_EXCHANGE_RATE = 'cc_expense_rate_cache';

const loadTransactions = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return stored ? JSON.parse(stored) : DEFAULT_TRANSACTIONS;
  } catch (error) {
    console.warn("Failed to load transactions from storage", error);
    return DEFAULT_TRANSACTIONS;
  }
};

let MOCK_TRANSACTIONS: Transaction[] = loadTransactions();

const saveTransactionsToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(MOCK_TRANSACTIONS));
  } catch (error) {
    console.error("Failed to save transactions to storage", error);
  }
};

let MOCK_BUDGETS: Budget[] = [
  { id: 'b1', category: 'Infrastructure', amount: 500, period: 'MONTHLY' },
  { id: 'b2', category: 'Food', amount: 1200, period: 'MONTHLY' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- CURRENCY LOGIC WITH CACHING ---
export const getUSDRate = async (): Promise<number> => {
  const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours
  
  // Try Cache
  const cached = localStorage.getItem(STORAGE_KEY_EXCHANGE_RATE);
  if (cached) {
    const { rate, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return rate;
    }
  }

  // Fetch New
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    const rate = parseFloat(data.USDBRL.bid);
    
    // Save Cache
    localStorage.setItem(STORAGE_KEY_EXCHANGE_RATE, JSON.stringify({
      rate,
      timestamp: Date.now()
    }));
    
    return rate;
  } catch (e) {
    console.error("Failed to fetch exchange rate", e);
    return 5.5; // Conservative Fallback
  }
};

// --- SMART CATEGORIZATION ---
const categorizeByDescription = (desc: string): string => {
  const d = desc.toLowerCase();
  if (d.includes('uber') || d.includes('99') || d.includes('posto') || d.includes('shell')) return 'Transport';
  if (d.includes('ifood') || d.includes('restaurante') || d.includes('bk') || d.includes('mc')) return 'Food';
  if (d.includes('netflix') || d.includes('spotify') || d.includes('prime')) return 'Entertainment';
  if (d.includes('aws') || d.includes('google') || d.includes('digitalocean')) return 'Infrastructure';
  if (d.includes('supermercado') || d.includes('carrefour') || d.includes('pao de acucar')) return 'Groceries';
  return 'General';
};

// --- TRANSACTION LOGIC ---
export const createTransaction = async (data: Partial<Transaction>): Promise<Transaction[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));

  let finalAmount = data.amount || 0;
  let exchangeRate = 1;
  
  // Handle Currency Conversion
  if (data.currency === Currency.USD) {
    exchangeRate = await getUSDRate();
    finalAmount = Number((finalAmount * exchangeRate).toFixed(2));
    
    // Preserve Original Data
    data.originalAmount = data.amount;
    data.originalCurrency = Currency.USD;
    data.exchangeRate = exchangeRate;
    
    // Normalize system currency
    data.currency = Currency.BRL; 
  }

  // Auto-categorize if empty
  if (!data.category || data.category === 'Uncategorized') {
    data.category = categorizeByDescription(data.description || '');
  }

  const transactionsToCreate: Transaction[] = [];
  const baseDate = new Date(data.date || new Date());
  const groupId = generateId();

  const defaultStatus = data.status || (data.type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING);

  // Installment Logic
  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1 && data.type === TransactionType.EXPENSE) {
    const totalAmount = finalAmount;
    const partAmount = Number((totalAmount / data.totalInstallments).toFixed(2));
    const totalCalculated = partAmount * data.totalInstallments;
    const remainder = Number((totalAmount - totalCalculated).toFixed(2));

    const currentInstallment = data.installmentNumber || 1;
    // Generate transactions from the current installment up to the total
    const countToGenerate = data.totalInstallments - currentInstallment + 1;

    for (let i = 0; i < countToGenerate; i++) {
      const thisInstallmentNum = currentInstallment + i;
      
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);

      // Only apply remainder to the very first installment of the plan (installment 1)
      // If user starts adding from #3, we assume #1 carried the remainder or we just use partAmount.
      // For simplicity, we add remainder to #1. If we are generating #1, add it.
      const amount = (thisInstallmentNum === 1) ? partAmount + remainder : partAmount;

      transactionsToCreate.push({
        ...data,
        id: generateId(),
        amount: amount,
        date: installmentDate.toISOString(),
        installmentId: groupId,
        installmentNumber: thisInstallmentNum,
        totalInstallments: data.totalInstallments,
        tags: data.tags || [],
        status: i === 0 ? defaultStatus : TransactionStatus.PENDING, // First generated record uses form status
      } as Transaction);
    }
  } else if (data.isRecurring) {
    const recurrenceCount = 6; 
    const frequency = data.recurrenceFrequency || RecurrenceFrequency.MONTHLY;
    
    for (let i = 0; i < recurrenceCount; i++) {
      const recurringDate = new Date(baseDate);
      if (frequency === RecurrenceFrequency.MONTHLY) recurringDate.setMonth(baseDate.getMonth() + i);
      else if (frequency === RecurrenceFrequency.WEEKLY) recurringDate.setDate(baseDate.getDate() + (i * 7));
      else if (frequency === RecurrenceFrequency.YEARLY) recurringDate.setFullYear(baseDate.getFullYear() + i);
      
      if (data.recurrenceEndDate && recurringDate > new Date(data.recurrenceEndDate)) break;

      transactionsToCreate.push({
        ...data,
        id: generateId(),
        amount: finalAmount,
        date: recurringDate.toISOString(),
        tags: data.tags || [],
        status: i === 0 ? defaultStatus : TransactionStatus.PENDING,
      } as Transaction);
    }
  } else {
    transactionsToCreate.push({
      ...data,
      id: generateId(),
      amount: finalAmount,
      tags: data.tags || [],
      status: defaultStatus,
    } as Transaction);
  }

  MOCK_TRANSACTIONS = [...transactionsToCreate, ...MOCK_TRANSACTIONS];
  saveTransactionsToStorage();
  
  return transactionsToCreate;
};

export const updateTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const index = MOCK_TRANSACTIONS.findIndex(t => t.id === data.id);
  if (index !== -1) {
    MOCK_TRANSACTIONS[index] = { 
      ...MOCK_TRANSACTIONS[index], 
      ...data,
      tags: data.tags || MOCK_TRANSACTIONS[index].tags 
    };
    saveTransactionsToStorage();
    return MOCK_TRANSACTIONS[index];
  }
  throw new Error("Transaction not found");
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600)); 
  return [...MOCK_TRANSACTIONS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 600)); 
  MOCK_TRANSACTIONS = MOCK_TRANSACTIONS.filter(t => t.id !== id);
  saveTransactionsToStorage();
};

// --- INTELLIGENT DASHBOARD STATS ---
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Basic Stats
  const openInvoice = MOCK_TRANSACTIONS
    .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING)
    .reduce((sum, t) => sum + t.amount, 0);

  const closedInvoice = MOCK_TRANSACTIONS
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);
  
  const upcomingMaturities = MOCK_TRANSACTIONS
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING && d >= now && d <= sevenDaysFromNow;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // --- Financial Health (3 Month Avg Logic) ---
  const currentMonthTotal = MOCK_TRANSACTIONS
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  let sumLast3Months = 0;
  let countMonths = 0;
  
  // Look back 3 months (excluding current)
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    
    const monthTotal = MOCK_TRANSACTIONS
      .filter(t => {
        const td = new Date(t.date);
        return t.type === TransactionType.EXPENSE && td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);
      
    if (monthTotal > 0) {
        sumLast3Months += monthTotal;
        countMonths++;
    }
  }
  
  // Avoid division by zero, assume at least 1 month of history or 0
  const avgLast3Months = countMonths > 0 ? sumLast3Months / countMonths : (sumLast3Months || currentMonthTotal); // Fallback to current if no history

  // Difference Calculation
  const diff = currentMonthTotal - avgLast3Months;
  const percentageDiff = avgLast3Months > 0 ? (diff / avgLast3Months) * 100 : 0;
  
  let healthStatus: FinancialHealth['status'] = 'HEALTHY';
  let healthMessage = "You are spending within your average.";

  if (percentageDiff > 10) {
      healthStatus = 'DANGER';
      healthMessage = `Warning! Spending is ${percentageDiff.toFixed(1)}% above average.`;
  } else if (percentageDiff > 0) {
      healthStatus = 'WARNING';
      healthMessage = `Caution. Spending is ${percentageDiff.toFixed(1)}% above average.`;
  } else {
      healthStatus = 'HEALTHY';
      healthMessage = `Great! You are saving ${Math.abs(percentageDiff).toFixed(1)}% vs average.`;
  }

  const health: FinancialHealth = {
    status: healthStatus,
    currentMonthTotal,
    averageLast3Months: avgLast3Months,
    percentageDiff: Math.abs(percentageDiff),
    message: healthMessage
  };

  // Monthly Trend Data
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthName = d.toLocaleString('default', { month: 'short' });
    
    const total = MOCK_TRANSACTIONS
      .filter(t => {
        const td = new Date(t.date);
        return t.type === TransactionType.EXPENSE && td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);
      
    monthlyTrend.push({
      month: monthName,
      amount: total,
      average: avgLast3Months
    });
  }

  return {
    openInvoice,
    closedInvoice,
    totalLimit: 65000,
    usedLimit: openInvoice + closedInvoice,
    upcomingMaturities,
    monthlyTrend,
    financialHealth: health
  };
};

export const fetchCards = async (): Promise<CreditCard[]> => {
  return MOCK_CARDS;
};

export const createCard = async (cardData: Omit<CreditCard, 'id'>): Promise<CreditCard> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const newCard = { ...cardData, id: generateId() };
  MOCK_CARDS = [...MOCK_CARDS, newCard];
  return newCard;
};

export const updateCard = async (cardData: CreditCard): Promise<CreditCard> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const index = MOCK_CARDS.findIndex(c => c.id === cardData.id);
  if (index !== -1) {
    MOCK_CARDS[index] = cardData;
    return cardData;
  }
  throw new Error("Card not found");
};

// --- BUDGETS ---
export const fetchBudgets = async (): Promise<BudgetUsage[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return MOCK_BUDGETS.map(budget => {
    const spent = MOCK_TRANSACTIONS
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === TransactionType.EXPENSE && t.category.toLowerCase() === budget.category.toLowerCase();
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentage: Math.min(100, (spent / budget.amount) * 100)
    };
  });
};

export const createBudget = async (budget: Partial<Budget>): Promise<Budget> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const newBudget = { ...budget, id: generateId(), period: 'MONTHLY' } as Budget;
  MOCK_BUDGETS.push(newBudget);
  return newBudget;
};

export const deleteBudget = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  MOCK_BUDGETS = MOCK_BUDGETS.filter(b => b.id !== id);
};

// --- IMPORTS ---
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
         category: categorizeByDescription(description), // Auto-Categorize
         type: parseFloat(amountMatch[1]) < 0 ? 'EXPENSE' : 'INCOME'
       });
     }
  });

  return transactions;
};

export const importTransactionsFromCSV = async (csvText: string): Promise<number> => {
  const lines = csvText.split('\n');
  let successCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 3) {
      const date = parts[0].trim();
      const desc = parts[1].trim();
      const amount = parseFloat(parts[2].trim());
      // Use provided category or auto-detect
      const category = parts[3]?.trim() || categorizeByDescription(desc);
      
      if (!isNaN(amount) && desc) {
        const type = amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
        await createTransaction({
          description: desc,
          amount: Math.abs(amount),
          date: new Date(date).toISOString(),
          type: type,
          status: type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING,
          category: category,
          currency: Currency.BRL,
          tags: ['Imported'],
          isRecurring: false,
          isInstallment: false
        });
        successCount++;
      }
    }
  }
  return successCount;
};

export const importTransactionsFromOFX = async (ofxText: string): Promise<number> => {
  const parsed = parseOFX(ofxText);
  let successCount = 0;

  for (const t of parsed) {
    await createTransaction({
      description: t.description,
      amount: Math.abs(t.amount),
      date: new Date(t.date).toISOString(),
      type: t.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      status: TransactionStatus.PAID,
      category: t.category,
      currency: Currency.BRL,
      tags: ['OFX Import'],
      isRecurring: false,
      isInstallment: false
    });
    successCount++;
  }
  return successCount;
};