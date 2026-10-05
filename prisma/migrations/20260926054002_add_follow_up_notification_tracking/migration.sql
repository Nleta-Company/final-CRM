/*
  Warnings:

  - A unique constraint covering the columns `[recipientId,notificationKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOW_UP_REMINDER';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "notificationKey" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT;

-- CreateIndex
CREATE INDEX "Notification_referenceId_idx" ON "Notification"("referenceId");

-- CreateIndex
CREATE INDEX "Notification_referenceType_idx" ON "Notification"("referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_notificationKey_key" ON "Notification"("recipientId", "notificationKey");
