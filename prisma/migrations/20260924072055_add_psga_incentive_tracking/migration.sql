-- CreateEnum
CREATE TYPE "PSGAStatus" AS ENUM ('GENERATED', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncentiveStatus" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "IncentiveRole" AS ENUM ('PRIMARY', 'SUPPORTING');

-- CreateTable
CREATE TABLE "PSGA" (
    "id" TEXT NOT NULL,
    "psgNumber" TEXT NOT NULL,
    "status" "PSGAStatus" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,
    "leadId" TEXT,
    "bdeId" TEXT,
    "incentiveStatus" "IncentiveStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "incentiveApprovedAt" TIMESTAMP(3),
    "incentivePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PSGA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PSGAIncentiveAllocation" (
    "id" TEXT NOT NULL,
    "psgId" TEXT NOT NULL,
    "bdeId" TEXT NOT NULL,
    "role" "IncentiveRole" NOT NULL,
    "reason" TEXT,
    "incentivePercent" DECIMAL(5,2) NOT NULL,
    "status" "IncentiveStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PSGAIncentiveAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PSGA_psgNumber_key" ON "PSGA"("psgNumber");

-- CreateIndex
CREATE INDEX "PSGA_clientId_idx" ON "PSGA"("clientId");

-- CreateIndex
CREATE INDEX "PSGA_leadId_idx" ON "PSGA"("leadId");

-- CreateIndex
CREATE INDEX "PSGA_bdeId_idx" ON "PSGA"("bdeId");

-- CreateIndex
CREATE INDEX "PSGA_status_idx" ON "PSGA"("status");

-- CreateIndex
CREATE INDEX "PSGA_incentiveStatus_idx" ON "PSGA"("incentiveStatus");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_psgId_idx" ON "PSGAIncentiveAllocation"("psgId");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_bdeId_idx" ON "PSGAIncentiveAllocation"("bdeId");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_approvedById_idx" ON "PSGAIncentiveAllocation"("approvedById");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_status_idx" ON "PSGAIncentiveAllocation"("status");

-- CreateIndex
CREATE INDEX "PSGAIncentiveAllocation_role_idx" ON "PSGAIncentiveAllocation"("role");

-- AddForeignKey
ALTER TABLE "PSGA" ADD CONSTRAINT "PSGA_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGA" ADD CONSTRAINT "PSGA_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGA" ADD CONSTRAINT "PSGA_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_psgId_fkey" FOREIGN KEY ("psgId") REFERENCES "PSGA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PSGAIncentiveAllocation" ADD CONSTRAINT "PSGAIncentiveAllocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
