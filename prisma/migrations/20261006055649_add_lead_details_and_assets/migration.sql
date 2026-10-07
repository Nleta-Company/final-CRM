-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "followUpRemarks" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "siteAddress" TEXT,
ADD COLUMN     "siteCity" TEXT,
ADD COLUMN     "siteName" TEXT,
ADD COLUMN     "siteState" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "LeadAsset" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assetName" TEXT,
    "assetReference" TEXT,
    "installationLocation" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "installationYear" INTEGER,
    "existingAmc" TEXT,
    "currentServiceProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadAsset_leadId_idx" ON "LeadAsset"("leadId");

-- CreateIndex
CREATE INDEX "LeadAsset_assetReference_idx" ON "LeadAsset"("assetReference");

-- CreateIndex
CREATE INDEX "Lead_customerType_idx" ON "Lead"("customerType");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_state_idx" ON "Lead"("state");

-- AddForeignKey
ALTER TABLE "LeadAsset" ADD CONSTRAINT "LeadAsset_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
