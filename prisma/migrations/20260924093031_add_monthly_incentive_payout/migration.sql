-- CreateEnum
CREATE TYPE "IncentivePayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "IncentivePayout" (
    "id" TEXT NOT NULL,
    "bdeId" TEXT NOT NULL,
    "salaryMonth" TIMESTAMP(3) NOT NULL,
    "totalIncentive" DECIMAL(12,2) NOT NULL,
    "status" "IncentivePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentivePayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncentivePayout_bdeId_idx" ON "IncentivePayout"("bdeId");

-- CreateIndex
CREATE INDEX "IncentivePayout_salaryMonth_idx" ON "IncentivePayout"("salaryMonth");

-- CreateIndex
CREATE INDEX "IncentivePayout_status_idx" ON "IncentivePayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePayout_bdeId_salaryMonth_key" ON "IncentivePayout"("bdeId", "salaryMonth");

-- AddForeignKey
ALTER TABLE "IncentivePayout" ADD CONSTRAINT "IncentivePayout_bdeId_fkey" FOREIGN KEY ("bdeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePayout" ADD CONSTRAINT "IncentivePayout_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
