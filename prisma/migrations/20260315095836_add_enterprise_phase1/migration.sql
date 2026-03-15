-- CreateEnum
CREATE TYPE "StockLogType" AS ENUM ('SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'TRANSFER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "minWholesaleQty" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "wholesalePrice" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "StockLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockLogType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "oldStock" DECIMAL(65,30) NOT NULL,
    "newStock" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLog_businessId_idx" ON "StockLog"("businessId");

-- CreateIndex
CREATE INDEX "StockLog_productId_idx" ON "StockLog"("productId");

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
