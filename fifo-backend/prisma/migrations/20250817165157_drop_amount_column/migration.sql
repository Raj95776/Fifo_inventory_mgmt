/*
  Warnings:

  - You are about to drop the column `amount` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `IssueItem` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `IssueItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `totalQuantity` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `weightedRate` on the `IssueNote` table. All the data in the column will be lost.
  - Added the required column `materialId` to the `IssueItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `materialId` to the `IssueNote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Grn_grnNumber_key";

-- DropIndex
DROP INDEX "IssueNote_issueNumber_key";

-- AlterTable
ALTER TABLE "Grn" DROP COLUMN "amount";

-- AlterTable
ALTER TABLE "IssueItem" DROP COLUMN "amount",
DROP COLUMN "rate",
ADD COLUMN     "materialId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "IssueNote" DROP COLUMN "totalAmount",
DROP COLUMN "totalQuantity",
DROP COLUMN "weightedRate",
ADD COLUMN     "materialId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Material" ALTER COLUMN "minStockLevel" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "IssueNote" ADD CONSTRAINT "IssueNote_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueItem" ADD CONSTRAINT "IssueItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
