import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting local database seeding...');

    // Create a default business
    const defaultBusiness = await prisma.business.upsert({
        where: { id: 'default-business-id' },
        update: {},
        create: {
            id: 'default-business-id',
            name: 'My Default Business',
            type: 'SHOP',
            address: '123 Test Street, City',
            phone: '+1234567890',
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
    });

    console.log('Created Default Business:', defaultBusiness.name);

    // You can add more seed data here as needed (Categories, initial Products, Admin User, etc.)
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('Seeding finished.');
    });
