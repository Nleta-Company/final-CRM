-- CreateEnum
CREATE TYPE "ClientProcessStage" AS ENUM ('CLIENT_CREATED', 'FSO_GENERATED', 'PSGA_GENERATED', 'PSGA_COMPLETED');

-- CreateEnum
CREATE TYPE "IncentiveRecipientType" AS ENUM ('BDE', 'ADMIN');

-- DropForeignKey
ALTER TABLE "PSGAIncentiveAllocation" DROP CONSTRAINT "PSGAIncentiveAllocation_bdeId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "externalClientId" TEXT,
ADD COLUMN     "fsoGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "fsoNumber" TEXT,
ADD COLUMN     "processStage" "ClientProcessStage" NOT NULL DEFAULT 'CLIENT_CREATED',
ADD COLUMN     "processUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "psgaGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PSGAIncentiveAllocation" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "recipientType" "IncentiveRecipientType" NOT NULL DEFAULT 'BDE',
ALTER COLUMN "bdeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Client_processStage_idx" ON "Client"("processStage");

-- CreateIndex
CREATE INDEX "Client_externalClientId_idx" ON "Client"("externalClientId");

-- CreateIndex
CREATE INDEX "Client_fsoNumber_idx" ON "Client"("fsoNumber");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_adminId_idx" ON "PSGAIncentiveAllocation"("adminId");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_recipientType_idx" ON "PSGAIncentiveAllocation"("recipientType");

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
