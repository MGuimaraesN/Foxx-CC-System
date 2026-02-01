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

    // Open Invoice (All Pending Expenses)
    const openInvoiceAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            status: 'PENDING'
        }
    });
    const openInvoice = openInvoiceAgg._sum.amount || 0;

    // Closed Invoice (Paid Expenses this month)
    const closedInvoiceAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            type: 'EXPENSE',
            status: 'PAID',
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

    res.json({
        openInvoice,
        closedInvoice,
        totalLimit: 65000, // Hardcoded in original, ideally sum of card limits
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
