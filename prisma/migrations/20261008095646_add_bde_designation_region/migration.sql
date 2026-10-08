/*
  Warnings:

  - You are about to drop the column `adminId` on the `IncentivePayout` table. All the data in the column will be lost.
  - You are about to drop the column `recipientType` on the `IncentivePayout` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `PSGAIncentiveAllocation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bdeId,salaryMonth]` on the table `IncentivePayout` will be added. If there are existing duplicate values, this will fail.
  - Made the column `bdeId` on table `IncentivePayout` required. This step will fail if there are existing NULL values in that column.
  - Made the column `psgId` on table `PSGAIncentiveAllocation` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "IncentivePayout" DROP CONSTRAINT "IncentivePayout_adminId_fkey";

-- DropForeignKey
ALTER TABLE "IncentivePayout" DROP CONSTRAINT "IncentivePayout_bdeId_fkey";

-- DropForeignKey
ALTER TABLE "PSGAIncentiveAllocation" DROP CONSTRAINT "PSGAIncentiveAllocation_clientId_fkey";

-- DropIndex
DROP INDEX "IncentivePayout_adminId_idx";

-- DropIndex
DROP INDEX "IncentivePayout_recipientType_bdeId_adminId_salaryMonth_key";

-- DropIndex
DROP INDEX "IncentivePayout_recipientType_idx";

-- DropIndex
DROP INDEX "PSGAIncentiveAllocation_clientId_idx";

-- AlterTable
ALTER TABLE "IncentivePayout" DROP COLUMN "adminId",
DROP COLUMN "recipientType",
ALTER COLUMN "bdeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PSGAIncentiveAllocation" DROP COLUMN "clientId",
ALTER COLUMN "psgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "Client_psgaNumber_idx" ON "Client"("psgaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePayout_bdeId_salaryMonth_key" ON "IncentivePayout"("bdeId", "salaryMonth");

-- AddForeignKey
ALTER TABLE "IncentivePayout" ADD CONSTRAINT "IncentivePayout_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
