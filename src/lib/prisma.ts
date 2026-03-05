import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env with override to ensure local settings take precedence
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

export const prisma = new PrismaClient({
    log: ['error', 'warn']
});
