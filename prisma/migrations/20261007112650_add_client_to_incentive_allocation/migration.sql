/*
  Warnings:

  - Added the required column `clientId` to the `PSGAIncentiveAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PSGAIncentiveAllocation" ADD COLUMN     "clientId" TEXT NOT NULL,
ALTER COLUMN "psgId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_clientId_idx" ON "PSGAIncentiveAllocation"("clientId");

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
