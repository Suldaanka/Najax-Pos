import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class DashboardController {
    static async getDashboardStats(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            let businessId = user?.activeBusinessId;

            // Self-healing: If no active business is selected, find the first business the user belongs to
            if (!businessId) {
                const firstMembership = await prisma.businessMember.findFirst({
                    where: { userId: req.user.id },
                    select: { businessId: true }
                });

                if (firstMembership) {
                    businessId = firstMembership.businessId;
                    // Update the user record so future requests are faster
                    await prisma.user.update({
                        where: { id: req.user.id },
                        data: { activeBusinessId: businessId }
                    });
                    console.log(`[DASHBOARD] Self-healed: Set activeBusinessId to ${businessId} for user ${req.user.id}`);
                } else {
                    console.warn(`[DASHBOARD] User ${req.user.id} has no memberships and no active business.`);
                    return res.status(400).json({ 
                        error: 'No active business selected',
                        detail: 'User has no business memberships. Please create a business first.',
                        userId: req.user.id
                    });
                }
            }

            console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && k[0] === k[0].toLowerCase()));

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [
                totalSalesResult,
                totalExpensesResult,
                totalLoansResult,
                outOfStockProducts,
                recentSales,
                topSellingItems,
                totalSalesCount,
                totalCustomersCount,
                totalRecurringExpensesResult,
                monthlySalesResult,
                monthlyExpensesResult
            ] = await Promise.all([
                // 1. All-time Total Revenue (for original stats)
                prisma.sale.aggregate({
                    where: { businessId },
                    _sum: { totalAmount: true }
                }),
                // 2. All-time Total Expenses
                prisma.expense.aggregate({
                    where: { businessId },
                    _sum: { amount: true }
                }),
                // 3. Total Loans (unpaid amount)
                prisma.loan.aggregate({
                    where: { businessId, status: { in: ['PENDING', 'PARTIAL'] } },
                    _sum: { totalAmount: true, paidAmount: true }
                }),
                // 4. Out of Stock Products
                prisma.product.findMany({
                    where: {
                        businessId,
                        // stockQuantity <= lowStockThreshold or 0
                        stockQuantity: { lte: 0 }
                    },
                    take: 5,
                    orderBy: { stockQuantity: 'asc' }
                }),
                // 5. Recent Sales
                prisma.sale.findMany({
                    where: { businessId },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { customer: true }
                }),
                // 6. Top Selling Products
                prisma.saleItem.groupBy({
                    by: ['productId'],
                    where: { sale: { businessId } },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 5
                }),
                // 7. Total Sales Count
                prisma.sale.count({
                    where: { businessId }
                }),
                // 8. Total Customers Count
                prisma.customer.count({
                    where: { businessId }
                }),
                // 9. Total Recurring Expenses
                (prisma as any).recurringExpense?.aggregate({
                    where: { businessId },
                    _sum: { amount: true }
                }) || Promise.resolve({ _sum: { amount: 0 } }),
                // 10. Monthly Revenue
                prisma.sale.aggregate({
                    where: { businessId, createdAt: { gte: startOfMonth } },
                    _sum: { totalAmount: true }
                }),
                // 11. Monthly Expenses
                prisma.expense.aggregate({
                    where: { businessId, date: { gte: startOfMonth } },
                    _sum: { amount: true }
                })
            ]);

            // For top selling items, we need product details
            const topProductIds = topSellingItems.map((item: any) => item.productId);
            const topProductsData = await prisma.product.findMany({
                where: { id: { in: topProductIds } }
            });

            const topProducts = topSellingItems.map((item: any) => ({
                product: topProductsData.find(p => p.id === item.productId),
                totalSold: item._sum.quantity
            }));

            const totalRevenue = totalSalesResult._sum.totalAmount || 0;
            const totalExpenses = totalExpensesResult._sum.amount || 0;
            const totalLoansAmount = totalLoansResult._sum.totalAmount || 0;
            const totalLoansPaid = totalLoansResult._sum.paidAmount || 0;
            const totalPendingLoans = Number(totalLoansAmount) - Number(totalLoansPaid);

            // Also calculate revenue over past few months for a chart?
            // Let's create a simple 6-month revenue mock/data for the chart
            // Note: In postgres, we can use group by date, but this is simpler:
            const last6Months = Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                return { month: d.getMonth(), year: d.getFullYear(), amount: 0 };
            }).reverse();

            const salesLast6Months = await prisma.sale.findMany({
                where: {
                    businessId,
                    createdAt: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 5))
                    }
                },
                select: { createdAt: true, totalAmount: true }
            });

            salesLast6Months.forEach(sale => {
                const saleMonth = sale.createdAt.getMonth();
                const saleYear = sale.createdAt.getFullYear();
                const monthData = last6Months.find(m => m.month === saleMonth && m.year === saleYear);
                if (monthData) {
                    monthData.amount += Number(sale.totalAmount);
                }
            });

            const chartData = last6Months.map(m => {
                const monthName = new Date(m.year, m.month, 1).toLocaleString('default', { month: 'short' });
                return { name: monthName, uv: m.amount };
            });

            const totalRecurringExpenses = (totalRecurringExpensesResult as any)?._sum?.amount || 0;

            const monthlyRevenue = monthlySalesResult._sum.totalAmount || 0;
            const monthlyExpenses = monthlyExpensesResult._sum.amount || 0;
            const netMonthlyRevenue = Number(monthlyRevenue) - Number(monthlyExpenses) - Number(totalRecurringExpenses);

            return res.json({
                revenue: Number(totalRevenue), // Keep all-time for main stats if needed, or switch to monthly
                monthlyRevenue: Number(monthlyRevenue),
                expenses: Number(totalExpenses),
                monthlyExpenses: Number(monthlyExpenses),
                recurringExpenses: Number(totalRecurringExpenses),
                netRevenue: netMonthlyRevenue,
                pendingLoans: totalPendingLoans,
                outOfStock: outOfStockProducts,
                recentTransactions: recentSales,
                topProducts: topProducts,
                chartData: chartData,
                totalSalesCount,
                totalCustomersCount
            });

        } catch (error) {
            console.error('Detailed Dashboard Error:', {
                name: (error as any).name,
                code: (error as any).code,
                clientVersion: (error as any).clientVersion,
                meta: (error as any).meta,
                message: (error as any).message
            });
            return res.status(500).json({
                error: 'Failed to fetch dashboard statistics',
                details: (error as any).message
            });
        }
    }
}
