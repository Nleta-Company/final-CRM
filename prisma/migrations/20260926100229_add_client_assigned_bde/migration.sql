-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "assignedBdeId" TEXT;

-- CreateIndex
CREATE INDEX "Client_assignedBdeId_idx" ON "Client"("assignedBdeId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedBdeId_fkey" FOREIGN KEY ("assignedBdeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
