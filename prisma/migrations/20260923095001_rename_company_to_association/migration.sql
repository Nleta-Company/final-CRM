/*
  Warnings:

  - You are about to drop the column `companyName` on the `Lead` table. All the data in the column will be lost.
  - Added the required column `associationName` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "companyName",
ADD COLUMN     "associationName" TEXT NOT NULL;
