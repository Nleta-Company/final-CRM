-- CreateEnum
CREATE TYPE "PricingBasis" AS ENUM ('SERVICE_RATE', 'ASSET_CATEGORY', 'LIFT_COUNT', 'CUSTOM');

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePricingRule" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "pricingBasis" "PricingBasis" NOT NULL,
    "pricingLabel" TEXT,
    "assetCategory" TEXT,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadServiceSelection" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "pricingBasis" "PricingBasis" NOT NULL,
    "pricingLabel" TEXT,
    "assetCategory" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "gstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadServiceSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientServiceSelection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "pricingBasis" "PricingBasis" NOT NULL,
    "pricingLabel" TEXT,
    "assetCategory" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitRate" DECIMAL(12,2) NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "gstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientServiceSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_code_key" ON "ServiceCatalog"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalog_isActive_idx" ON "ServiceCatalog"("isActive");

-- CreateIndex
CREATE INDEX "ServicePricingRule_serviceId_idx" ON "ServicePricingRule"("serviceId");

-- CreateIndex
CREATE INDEX "ServicePricingRule_pricingBasis_idx" ON "ServicePricingRule"("pricingBasis");

-- CreateIndex
CREATE INDEX "ServicePricingRule_isActive_idx" ON "ServicePricingRule"("isActive");

-- CreateIndex
CREATE INDEX "LeadServiceSelection_leadId_idx" ON "LeadServiceSelection"("leadId");

-- CreateIndex
CREATE INDEX "LeadServiceSelection_serviceId_idx" ON "LeadServiceSelection"("serviceId");

-- CreateIndex
CREATE INDEX "LeadServiceSelection_createdById_idx" ON "LeadServiceSelection"("createdById");

-- CreateIndex
CREATE INDEX "ClientServiceSelection_clientId_idx" ON "ClientServiceSelection"("clientId");

-- CreateIndex
CREATE INDEX "ClientServiceSelection_serviceId_idx" ON "ClientServiceSelection"("serviceId");

-- CreateIndex
CREATE INDEX "ClientServiceSelection_createdById_idx" ON "ClientServiceSelection"("createdById");

-- AddForeignKey
ALTER TABLE "ServicePricingRule" ADD CONSTRAINT "ServicePricingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadServiceSelection" ADD CONSTRAINT "LeadServiceSelection_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadServiceSelection" ADD CONSTRAINT "LeadServiceSelection_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadServiceSelection" ADD CONSTRAINT "LeadServiceSelection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServiceSelection" ADD CONSTRAINT "ClientServiceSelection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServiceSelection" ADD CONSTRAINT "ClientServiceSelection_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServiceSelection" ADD CONSTRAINT "ClientServiceSelection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
