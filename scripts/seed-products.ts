import { prisma } from '../src/lib/prisma';

async function main() {
    const businessId = 'cmlwgjch300006ouxeozlzdpa'; // Al raxma

    const products = [
        { name: 'Laptop Pro', costPrice: 800, sellingPrice: 1200, stockQuantity: 10, barcode: 'LAP001' },
        { name: 'Wireless Mouse', costPrice: 15, sellingPrice: 30, stockQuantity: 50, barcode: 'MOU001' },
        { name: 'Mechanical Keyboard', costPrice: 45, sellingPrice: 90, stockQuantity: 25, barcode: 'KEY001' },
        { name: '4K Monitor', costPrice: 200, sellingPrice: 350, stockQuantity: 15, barcode: 'MON001' },
        { name: 'USB-C Cable', costPrice: 5, sellingPrice: 15, stockQuantity: 100, barcode: 'USB001' },
        { name: 'Headphones', costPrice: 50, sellingPrice: 120, stockQuantity: 20, barcode: 'HED001' },
        { name: 'Webcam HD', costPrice: 30, sellingPrice: 70, stockQuantity: 30, barcode: 'CAM001' },
        { name: 'External SSD 1TB', costPrice: 70, sellingPrice: 150, stockQuantity: 12, barcode: 'SSD001' },
        { name: 'Desk Lamp', costPrice: 20, sellingPrice: 45, stockQuantity: 40, barcode: 'LMP001' },
        { name: 'Office Chair', costPrice: 100, sellingPrice: 200, stockQuantity: 8, barcode: 'CHR001' },
    ];

    console.log('Starting to seed products...');

    for (const p of products) {
        try {
            const product = await prisma.product.upsert({
                where: {
                    businessId_barcode: {
                        businessId: businessId,
                        barcode: p.barcode
                    }
                },
                update: {}, // Don't update if it exists
                create: {
                    ...p,
                    businessId: businessId
                }
            });
            console.log(`Created/Ensured product: ${product.name}`);
        } catch (error) {
            console.error(`Error creating product ${p.name}:`, error);
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
