import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Prisma Client is initialized using environment variables already loaded in server.ts

export const prisma = new PrismaClient({
    log: ['error', 'warn']
});
