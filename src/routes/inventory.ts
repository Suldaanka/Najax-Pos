import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { PurchaseController } from '../controllers/purchaseController';
import { ExchangeRateController } from '../controllers/exchangeRateController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

// Suppliers
router.get('/suppliers', checkAuth as any, SupplierController.getSuppliers as any);
router.post('/suppliers', checkAuth as any, SupplierController.createSupplier as any);
router.put('/suppliers/:id', checkAuth as any, SupplierController.updateSupplier as any);
router.delete('/suppliers/:id', checkAuth as any, SupplierController.deleteSupplier as any);

// Purchases
router.get('/purchases', checkAuth as any, PurchaseController.getPurchases as any);
router.post('/purchases', checkAuth as any, PurchaseController.createPurchase as any);
router.delete('/purchases/:id', checkAuth as any, PurchaseController.deletePurchase as any);

// Exchange Rates
router.get('/exchange-rates', checkAuth as any, ExchangeRateController.getExchangeRates as any);
router.post('/exchange-rates', checkAuth as any, ExchangeRateController.updateExchangeRate as any);

export default router;
