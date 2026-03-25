import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { PurchaseController } from '../controllers/purchaseController';
import { ExchangeRateController } from '../controllers/exchangeRateController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

import { StockLogController } from '../controllers/stockLogController';

const router = Router();

// Stock Logs
router.get('/stock-logs', checkAuth as any, StockLogController.getBusinessLogs as any);
router.get('/stock-logs/:productId', checkAuth as any, StockLogController.getProductLogs as any);

// Suppliers
router.get('/suppliers', checkAuth as any, SupplierController.getSuppliers as any);
router.post('/suppliers', checkAuth as any, checkRole(['OWNER']), SupplierController.createSupplier as any);
router.put('/suppliers/:id', checkAuth as any, checkRole(['OWNER']), SupplierController.updateSupplier as any);
router.delete('/suppliers/:id', checkAuth as any, checkRole(['OWNER']), SupplierController.deleteSupplier as any);

// Purchases
router.get('/purchases', checkAuth as any, PurchaseController.getPurchases as any);
router.post('/purchases', checkAuth as any, checkRole(['OWNER']), PurchaseController.createPurchase as any);
router.delete('/purchases/:id', checkAuth as any, checkRole(['OWNER']), PurchaseController.deletePurchase as any);

// Exchange Rates
router.get('/exchange-rates', checkAuth as any, ExchangeRateController.getExchangeRates as any);
router.post('/exchange-rates', checkAuth as any, checkRole(['OWNER']), ExchangeRateController.updateExchangeRate as any);

export default router;
