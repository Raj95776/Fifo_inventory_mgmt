/*
  Warnings:

  - Added the required column `amount` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `IssueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `IssueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuantity` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weightedRate` to the `IssueNote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Grn" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "IssueItem" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "IssueNote" ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalQuantity" INTEGER NOT NULL,
ADD COLUMN     "weightedRate" DOUBLE PRECISION NOT NULL;
