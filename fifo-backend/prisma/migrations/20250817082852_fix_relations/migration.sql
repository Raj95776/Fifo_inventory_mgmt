/*
  Warnings:

  - A unique constraint covering the columns `[grnNumber]` on the table `Grn` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[issueNumber]` on the table `IssueNote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grnNumber` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierName` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `IssueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `IssueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issueNumber` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuantity` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weightedRate` to the `IssueNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minStockLevel` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `Material` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Grn" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "grnNumber" TEXT NOT NULL,
ADD COLUMN     "remaining" INTEGER NOT NULL,
ADD COLUMN     "supplierName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "IssueItem" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "IssueNote" ADD COLUMN     "issueNumber" TEXT NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalQuantity" INTEGER NOT NULL,
ADD COLUMN     "weightedRate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "category" TEXT,
ADD COLUMN     "minStockLevel" INTEGER NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Grn_grnNumber_key" ON "Grn"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IssueNote_issueNumber_key" ON "IssueNote"("issueNumber");
