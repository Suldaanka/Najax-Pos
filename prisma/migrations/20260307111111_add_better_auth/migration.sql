-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeBusinessId" TEXT;

-- CreateIndex
CREATE INDEX "User_activeBusinessId_idx" ON "User"("activeBusinessId");
