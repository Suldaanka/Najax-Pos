import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';

// Routes
import authRoutes from './routes/auth';
import businessRoutes from './routes/business';
import productRoutes from './routes/product';
import staffRoutes from './routes/staff';
import expenseRoutes from './routes/expense';
import recurringExpenseRoutes from './routes/recurringExpenseRoutes';
import customerRoutes from './routes/customer';
import categoryRoutes from './routes/category';
import loanRoutes from './routes/loan';
import saleRoutes from './routes/sale';
import invitationRoutes from './routes/invitation';
import dashboardRoutes from './routes/dashboard';
import inventoryRoutes from './routes/inventory';

const app = express();

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Trust proxy for Railway/Production to handle HTTPS/Cookies correctly
app.set('trust proxy', true);

// CORS must come before Better Auth handler
app.use(cors({
    origin: (origin, callback) => {
        // Must echo back the actual origin (not '*') when using credentials: true
        callback(null, origin || '*');
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
}));

// Better Auth handler MUST be mounted before express.json()
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(helmet());
app.use(express.json());

// Mount Routes
app.use('/api/business', businessRoutes);
app.use('/api/products', productRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/recurring-expenses', recurringExpenseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api', authRoutes); // Custom auth routes

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

export default app;
