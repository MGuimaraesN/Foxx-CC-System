import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({
  url: dbPath
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Iniciando o processo de "Seed" (Populando o banco de dados)...');

  // Limpar dados existentes para evitar duplicados
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Utilizador Demo
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Utilizador Pro',
      email: 'test@example.com',
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=foxx',
    },
  });

  // 2. Criar Cartões de Crédito (Testar diferentes cores e limites)
  const nubank = await prisma.card.create({
    data: {
      userId: user.id,
      name: 'Nubank Ultravioleta',
      last4Digits: '8842',
      limit: 15000,
      closingDay: 1,
      dueDay: 10,
      color: 'bg-purple-600',
    },
  });

  const xp = await prisma.card.create({
    data: {
      userId: user.id,
      name: 'XP Visa Infinite',
      last4Digits: '1234',
      limit: 30000,
      closingDay: 15,
      dueDay: 25,
      color: 'bg-slate-900',
    },
  });

  const inter = await prisma.card.create({
    data: {
      userId: user.id,
      name: 'Inter Black',
      last4Digits: '9900',
      limit: 10000,
      closingDay: 5,
      dueDay: 15,
      color: 'bg-orange-500',
    },
  });

  // 3. Criar Orçamentos (Budgets) para o Dashboard
  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: 'Alimentação', amount: 2000, period: 'MONTHLY' },
      { userId: user.id, category: 'Lazer', amount: 1000, period: 'MONTHLY' },
      { userId: user.id, category: 'Educação', amount: 1500, period: 'MONTHLY' },
      { userId: user.id, category: 'Saúde', amount: 500, period: 'MONTHLY' },
    ],
  });

  // 4. Gerar Transações Históricas (Últimos 6 meses para o gráfico de tendências)
  const categories = ['Alimentação', 'Transporte', 'Lazer', 'Assinaturas', 'Saúde'];
  const monthOffsets = [0, 1, 2, 3, 4, 5];
  
  for (const offset of monthOffsets) {
    const date = new Date();
    date.setMonth(date.getMonth() - offset);
    
    // Adicionar uma receita mensal fixa
    await prisma.transaction.create({
      data: {
        userId: user.id,
        description: `Salário Mensal - Mês -${offset}`,
        amount: 8000 + Math.random() * 1000,
        date: new Date(date.getFullYear(), date.getMonth(), 5),
        type: 'INCOME',
        status: 'PAID',
        category: 'Trabalho',
      },
    });

    // Adicionar despesas variadas por mês
    for (const cat of categories) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          description: `Gasto com ${cat}`,
          amount: 100 + Math.random() * 400,
          date: new Date(date.getFullYear(), date.getMonth(), 10 + Math.random() * 15),
          type: 'EXPENSE',
          status: 'PAID',
          category: cat,
          cardId: Math.random() > 0.5 ? nubank.id : xp.id,
        },
      });
    }
  }

  // 5. Testar Lógica de Parcelamento (Compra grande em 12x)
  const bigPurchaseId = uuidv4();
  const installments = [];
  for (let i = 1; i <= 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i - 3); // Começou há 3 meses
    installments.push({
      userId: user.id,
      cardId: xp.id,
      description: `iPhone 15 Pro Max (${i}/12)`,
      amount: 850.50,
      date,
      type: 'EXPENSE',
      status: i <= 3 ? 'PAID' : 'PENDING', // Primeiras 3 pagas
      category: 'Tecnologia',
      isInstallment: true,
      installmentId: bigPurchaseId,
      installmentNumber: i,
      totalInstallments: 12,
    });
  }
  await prisma.transaction.createMany({ data: installments });

  // 6. Transações Pendentes Urgentes (Para testar o widget de vencimentos)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  await prisma.transaction.create({
    data: {
      userId: user.id,
      description: 'Conta de Energia (Vence amanhã)',
      amount: 345.90,
      date: tomorrow,
      type: 'EXPENSE',
      status: 'PENDING',
      category: 'Casa',
      tags: 'Urgente,Fixa',
    },
  });

  console.log('✅ Seed finalizado! Utilize test@example.com / password123 para aceder.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
