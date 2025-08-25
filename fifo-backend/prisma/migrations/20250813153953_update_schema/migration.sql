/*
  Warnings:

  - The primary key for the `Grn` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `grnNumber` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceRef` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `receivedBy` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `remainingQuantity` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `supplierName` on the `Grn` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Grn` table. All the data in the column will be lost.
  - The `id` column on the `Grn` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `quantity` on the `Grn` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The primary key for the `IssueItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amount` on the `IssueItem` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `IssueItem` table. All the data in the column will be lost.
  - The `id` column on the `IssueItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `quantity` on the `IssueItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The primary key for the `IssueNote` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `approvedBy` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `issueNumber` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `issuedTo` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `totalQuantity` on the `IssueNote` table. All the data in the column will be lost.
  - You are about to drop the column `weightedRate` on the `IssueNote` table. All the data in the column will be lost.
  - The `id` column on the `IssueNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Material` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `minStockLevel` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Material` table. All the data in the column will be lost.
  - The `id` column on the `Material` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `receivedDate` to the `Grn` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `materialId` on the `Grn` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `issueNoteId` on the `IssueItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `grnId` on the `IssueItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `issueDate` to the `IssueNote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Grn" DROP CONSTRAINT "Grn_materialId_fkey";

-- DropForeignKey
ALTER TABLE "IssueItem" DROP CONSTRAINT "IssueItem_grnId_fkey";

-- DropForeignKey
ALTER TABLE "IssueItem" DROP CONSTRAINT "IssueItem_issueNoteId_fkey";

-- DropForeignKey
ALTER TABLE "IssueNote" DROP CONSTRAINT "IssueNote_materialId_fkey";

-- DropIndex
DROP INDEX "Grn_grnNumber_key";

-- DropIndex
DROP INDEX "IssueNote_issueNumber_key";

-- AlterTable
ALTER TABLE "Grn" DROP CONSTRAINT "Grn_pkey",
DROP COLUMN "date",
DROP COLUMN "grnNumber",
DROP COLUMN "invoiceRef",
DROP COLUMN "receivedBy",
DROP COLUMN "remainingQuantity",
DROP COLUMN "remarks",
DROP COLUMN "supplierName",
DROP COLUMN "totalAmount",
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "materialId",
ADD COLUMN     "materialId" INTEGER NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER,
ADD CONSTRAINT "Grn_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "IssueItem" DROP CONSTRAINT "IssueItem_pkey",
DROP COLUMN "amount",
DROP COLUMN "rate",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "issueNoteId",
ADD COLUMN     "issueNoteId" INTEGER NOT NULL,
DROP COLUMN "grnId",
ADD COLUMN     "grnId" INTEGER NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER,
ADD CONSTRAINT "IssueItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "IssueNote" DROP CONSTRAINT "IssueNote_pkey",
DROP COLUMN "approvedBy",
DROP COLUMN "date",
DROP COLUMN "issueNumber",
DROP COLUMN "issuedTo",
DROP COLUMN "materialId",
DROP COLUMN "purpose",
DROP COLUMN "totalAmount",
DROP COLUMN "totalQuantity",
DROP COLUMN "weightedRate",
ADD COLUMN     "issueDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "IssueNote_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Material" DROP CONSTRAINT "Material_pkey",
DROP COLUMN "category",
DROP COLUMN "createdAt",
DROP COLUMN "minStockLevel",
DROP COLUMN "unit",
DROP COLUMN "updatedAt",
ADD COLUMN     "description" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Material_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Grn" ADD CONSTRAINT "Grn_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueItem" ADD CONSTRAINT "IssueItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "Grn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueItem" ADD CONSTRAINT "IssueItem_issueNoteId_fkey" FOREIGN KEY ("issueNoteId") REFERENCES "IssueNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
