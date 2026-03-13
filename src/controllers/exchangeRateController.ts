import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class ExchangeRateController {
    static async getExchangeRates(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const rates = await prisma.exchangeRate.findMany({
                where: { businessId: user.activeBusinessId }
            });

            return res.json(rates);
        } catch (error) {
            console.error('Get exchange rates error:', error);
            return res.status(500).json({ error: 'Failed to fetch exchange rates' });
        }
    }

    static async updateExchangeRate(req: AuthRequest, res: Response) {
        try {
            const { fromCurrency, toCurrency, rate } = req.body;
            
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const exchangeRate = await prisma.exchangeRate.upsert({
                where: {
                    businessId_fromCurrency_toCurrency: {
                        businessId: user.activeBusinessId,
                        fromCurrency,
                        toCurrency
                    }
                },
                update: { rate },
                create: {
                    businessId: user.activeBusinessId,
                    fromCurrency,
                    toCurrency,
                    rate
                }
            });

            return res.json(exchangeRate);
        } catch (error) {
            console.error('Update exchange rate error:', error);
            return res.status(500).json({ error: 'Failed to update exchange rate' });
        }
    }
}
