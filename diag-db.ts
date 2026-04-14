import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

async function main() {
  console.log('Testing Prisma connection...');
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));
  
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Connection successful!', result);
  } catch (error) {
    console.error('Connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
