import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  // Cleanup existing data
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();

  console.log('Deleted existing data.');

  // Create User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      avatarUrl: '',
    },
  });

  console.log('Created user:', user.email);

  // Create Cards
  const card1 = await prisma.card.create({
    data: {
      userId: user.id,
      name: 'Nubank Platinum',
      last4Digits: '4242',
      limit: 15000,
      closingDay: 5,
      dueDay: 12,
      color: 'bg-purple-600',
    },
  });

  const card2 = await prisma.card.create({
    data: {
      userId: user.id,
      name: 'XP Visa Infinite',
      last4Digits: '8811',
      limit: 50000,
      closingDay: 20,
      dueDay: 27,
      color: 'bg-slate-800',
    },
  });

  console.log('Created cards:', card1.name, card2.name);

  // Create Budgets
  await prisma.budget.create({
    data: {
      userId: user.id,
      category: 'Infrastructure',
      amount: 500,
      period: 'MONTHLY',
    },
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      category: 'Food',
      amount: 1200,
      period: 'MONTHLY',
    },
  });

  console.log('Created budgets.');

  // Create Transactions
  // 1. AWS Infrastructure (Recurring)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      cardId: card2.id,
      description: 'AWS Infrastructure',
      amount: 602.50,
      date: new Date(),
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Infrastructure',
      tags: 'Cloud,DevOps',
      isRecurring: true,
      recurrenceFrequency: 'MONTHLY',
    },
  });

  // 2. MacBook Pro M3 (Installments)
  const totalInstallments = 10;
  const totalAmount = 12000.00;
  const installmentId = uuidv4();
  const partAmount = 1200.00; // Simplified equal parts for seed
  const baseDate = new Date();

  for (let i = 0; i < totalInstallments; i++) {
    const date = new Date(baseDate);
    date.setMonth(baseDate.getMonth() + i);

    await prisma.transaction.create({
      data: {
        userId: user.id,
        cardId: card1.id,
        description: 'MacBook Pro M3',
        amount: partAmount,
        date: date,
        type: 'EXPENSE',
        status: i === 0 ? 'PAID' : 'PENDING', // First paid, others pending
        category: 'Equipment',
        tags: 'Office',
        isInstallment: true,
        installmentId: installmentId,
        installmentNumber: i + 1,
        totalInstallments: totalInstallments,
      },
    });
  }

  console.log('Created transactions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
