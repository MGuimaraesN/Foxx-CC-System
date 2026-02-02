import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.id;

  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Calculate Total Limit (Sum of all cards)
    const totalLimitAgg = await prisma.card.aggregate({
        _sum: { limit: true },
        where: { userId }
    });
    const totalLimit = totalLimitAgg._sum.limit || 0;

    // Open Invoice (All Pending Expenses) - Filtered by Closing Day
    const pendingExpenses = await prisma.transaction.findMany({
        where: {
            userId,
            type: 'EXPENSE',
            status: 'PENDING',
            deletedAt: null
        },
        include: { card: true }
    });

    let openInvoice = 0;

    for (const t of pendingExpenses) {
        if (t.card) {
            const closingDay = t.card.closingDay;
            const txDate = new Date(t.date);
            const currentDay = now.getDate();

            let cycleStart: Date;
            let cycleEnd: Date;

            // Calculate strict billing cycle based on today vs closingDay
            if (currentDay <= closingDay) {
                // Invoice closes this month. Cycle started previous month.
                cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
                cycleEnd = new Date(now.getFullYear(), now.getMonth(), closingDay);
            } else {
                // Invoice closes next month. Cycle started this month.
                cycleStart = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
                cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
            }

            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(23, 59, 59, 999);

            // Only count if strictly within the current open cycle
            if (txDate >= cycleStart && txDate <= cycleEnd) {
                openInvoice += t.amount;
            }
        } else {
            openInvoice += t.amount;
        }
    }

    // Closed Invoice (Paid Expenses this month)
    const closedInvoiceAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            status: 'PAID',
            deletedAt: null,
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        }
    });
    const closedInvoice = closedInvoiceAgg._sum.amount || 0;

    // Upcoming Maturities (Next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const upcomingAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            status: 'PENDING',
            deletedAt: null,
            date: {
                gte: now,
                lte: sevenDaysFromNow
            }
        }
    });
    const upcomingMaturities = upcomingAgg._sum.amount || 0;

    // Financial Health (Last 3 months avg)
    const currentMonthTotalAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            deletedAt: null,
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        }
    });
    const currentMonthTotal = currentMonthTotalAgg._sum.amount || 0;

    // Last 3 months (excluding current)
    let sumLast3Months = 0;
    let countMonths = 0;
    for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setMonth(currentMonth - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);

        const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                type: 'EXPENSE',
                deletedAt: null,
                date: {
                    gte: start,
                    lte: end
                }
            }
        });
        if (agg._sum.amount) {
            sumLast3Months += agg._sum.amount;
            countMonths++;
        }
    }
    const avgLast3Months = countMonths > 0 ? sumLast3Months / countMonths : (sumLast3Months || currentMonthTotal);

    const diff = currentMonthTotal - avgLast3Months;
    const percentageDiff = avgLast3Months > 0 ? (diff / avgLast3Months) * 100 : 0;

    let healthStatus = 'HEALTHY';
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

    // Monthly Trend (Last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(currentMonth - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        const monthName = d.toLocaleString('default', { month: 'short' });

        const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                type: 'EXPENSE',
                deletedAt: null,
                date: {
                    gte: start,
                    lte: end
                }
            }
        });

        monthlyTrend.push({
            month: monthName,
            amount: agg._sum.amount || 0,
            average: avgLast3Months
        });
    }

    // Expense Breakdown (Category) - Current Month
    const categoryAgg = await prisma.transaction.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            deletedAt: null,
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        }
    });
    const expenseBreakdown = categoryAgg.map(item => ({
        name: item.category,
        value: item._sum.amount || 0
    })).sort((a, b) => b.value - a.value);

    // Daily Trend - Current Month
    const monthExpenses = await prisma.transaction.findMany({
        where: {
            userId,
            type: 'EXPENSE',
            deletedAt: null,
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        },
        select: { date: true, amount: true }
    });

    const dailyMap = new Map<number, number>();
    const daysInMonth = endOfMonth.getDate();
    for (let i = 1; i <= daysInMonth; i++) dailyMap.set(i, 0);

    monthExpenses.forEach(t => {
        const day = t.date.getDate();
        dailyMap.set(day, (dailyMap.get(day) || 0) + t.amount);
    });

    const dailyTrend = Array.from(dailyMap.entries()).map(([day, amount]) => ({
        day: day.toString(),
        current: amount,
        previous: Number((avgLast3Months / 30).toFixed(2)) // Rough daily average
    })).sort((a, b) => Number(a.day) - Number(b.day));

    res.json({
        openInvoice,
        closedInvoice,
        expenseBreakdown,
        dailyTrend,
        totalLimit,
        usedLimit: openInvoice + closedInvoice,
        upcomingMaturities,
        monthlyTrend,
        financialHealth: {
            status: healthStatus,
            currentMonthTotal,
            averageLast3Months: avgLast3Months,
            percentageDiff: Math.abs(percentageDiff),
            message: healthMessage
        }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
