import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SifaloPay } from '../utils/sifaloPay';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export class SubscriptionController {
  /**
   * Initiate a subscription payment via SifaloPay.
   */
  static async initiatePayment(req: any, res: Response) {
    try {
      const { plan, amount, phone, gateway } = req.body;
      const businessId = req.user.activeBusinessId;

      if (!businessId) {
        return res.status(400).json({ error: 'No active business selected' });
      }

      if (!plan || !amount || !phone || !gateway) {
        return res.status(400).json({ error: 'plan, amount, phone, and gateway are required' });
      }

      // 1. Create a PENDING subscription record
      const subscription = await prisma.subscription.create({
        data: {
          businessId,
          plan,
          amount,
          status: 'INACTIVE',
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: gateway.toUpperCase() as PaymentMethod,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        }
      });

      // 2. Trigger SifaloPay
      try {
        const sifaloResponse = await SifaloPay.initiatePayment({
          account: phone,
          gateway: gateway,
          amount: amount.toString(),
          currency: 'USD',
          order_id: subscription.id
        });

        // Update with transaction ID if provided
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { sifaloTransactionId: sifaloResponse.sid }
        });

        if (sifaloResponse.code === '601') {
          // Immediate success (unlikely for push, but possible)
          await this.finalizeSubscription(subscription.id, businessId);
          return res.json({ status: 'SUCCESS', message: 'Payment successful', subscriptionId: subscription.id });
        }

        if (sifaloResponse.code === '603') {
          return res.json({ 
            status: 'PENDING', 
            message: 'Push notification sent. Please approve on your phone.', 
            subscriptionId: subscription.id 
          });
        }

        // Other codes indicate failure
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
        return res.status(400).json({ status: 'FAILED', message: sifaloResponse.response });

      } catch (payError: any) {
        console.error('SifaloPay Error:', payError);
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
        return res.status(500).json({ error: 'Payment gateway error', detail: payError.message });
      }

    } catch (error: any) {
      console.error('Subscription Initiation Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify the status of a pending subscription payment.
   */
  static async verifyStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subscription = await prisma.subscription.findUnique({
        where: { id: id as string },
        include: { business: true }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      if (subscription.paymentStatus !== PaymentStatus.PENDING) {
        return res.json({ status: subscription.paymentStatus, subscription });
      }

      // Check SifaloPay status
      const verifyRes = await SifaloPay.verifyPayment(subscription.sifaloTransactionId || subscription.id);

      if (verifyRes.status === 'success' || verifyRes.code === 601) {
        await this.finalizeSubscription(subscription.id, subscription.businessId);
        return res.json({ status: 'SUCCESS', message: 'Payment verified successfully' });
      }

      if (verifyRes.status === 'failure' || verifyRes.code === 600 || verifyRes.code === 604) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
        return res.json({ status: 'FAILED', message: 'Payment failed' });
      }

      return res.json({ status: 'PENDING', message: 'Still waiting for approval' });

    } catch (error: any) {
      console.error('Verify Status Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Helper to activate business subscription.
   */
  private static async finalizeSubscription(subscriptionId: string, businessId: string) {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { 
        paymentStatus: PaymentStatus.SUCCESS,
        status: 'ACTIVE'
      }
    });

    await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiry: subscription.endDate
      }
    });
  }

  /**
   * Get current subscription status for a business.
   */
  static async getStatus(req: any, res: Response) {
    try {
      const businessId = req.user.activeBusinessId;
      if (!businessId) return res.status(400).json({ error: 'No active business' });

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      res.json(business);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
