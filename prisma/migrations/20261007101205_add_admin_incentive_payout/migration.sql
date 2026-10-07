/*
  Warnings:

  - A unique constraint covering the columns `[recipientType,bdeId,adminId,salaryMonth]` on the table `IncentivePayout` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "IncentivePayout" DROP CONSTRAINT "IncentivePayout_bdeId_fkey";

-- DropIndex
DROP INDEX "IncentivePayout_bdeId_salaryMonth_key";

-- AlterTable
ALTER TABLE "IncentivePayout" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "recipientType" "IncentiveRecipientType" NOT NULL DEFAULT 'BDE',
ALTER COLUMN "bdeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "IncentivePayout_adminId_idx" ON "IncentivePayout"("adminId");

-- CreateIndex
CREATE INDEX "IncentivePayout_recipientType_idx" ON "IncentivePayout"("recipientType");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePayout_recipientType_bdeId_adminId_salaryMonth_key" ON "IncentivePayout"("recipientType", "bdeId", "adminId", "salaryMonth");

-- AddForeignKey
ALTER TABLE "IncentivePayout" ADD CONSTRAINT "IncentivePayout_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePayout" ADD CONSTRAINT "IncentivePayout_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
