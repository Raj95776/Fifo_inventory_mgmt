import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // ------------------ Materials ------------------
  const cement = await prisma.material.create({
    data: {
      name: "Cement",
      description: "High quality cement",
      unit: "Bags",
      category: "Construction",
      minStockLevel: 50,
    },
  });

  const steel = await prisma.material.create({
    data: {
      name: "Steel",
      description: "Reinforcement bars",
      unit: "Kg",
      category: "Construction",
      minStockLevel: 100,
    },
  });

  const sand = await prisma.material.create({
    data: {
      name: "Sand",
      description: "River sand",
      unit: "Ton",
      category: "Construction",
      minStockLevel: 30,
    },
  });

  // ------------------ GRNs ------------------
  const grn1 = await prisma.grn.create({
    data: {
      grnNumber: "GRN-001",
      materialId: cement.id,
      quantity: 100,
      remaining: 100,
      rate: 350,
      amount: 100 * 350,
      supplierName: "ABC Supplier",
      receivedDate: new Date("2025-08-14"),
    },
  });

  const grn2 = await prisma.grn.create({
    data: {
      grnNumber: "GRN-002",
      materialId: steel.id,
      quantity: 50,
      remaining: 50,
      rate: 50000,
      amount: 50 * 50000,
      supplierName: "XYZ Supplier",
      receivedDate: new Date("2025-08-15"),
    },
  });

  const grn3 = await prisma.grn.create({
    data: {
      grnNumber: "GRN-003",
      materialId: sand.id,
      quantity: 40,
      remaining: 40,
      rate: 1200,
      amount: 40 * 1200,
      supplierName: "SandCo",
      receivedDate: new Date("2025-08-16"),
    },
  });

  const grn4 = await prisma.grn.create({
    data: {
      grnNumber: "GRN-004",
      materialId: cement.id,
      quantity: 80,
      remaining: 80,
      rate: 360,
      amount: 80 * 360,
      supplierName: "ABC Supplier",
      receivedDate: new Date("2025-08-18"),
    },
  });

  // ------------------ Issue Notes + Items ------------------
  await prisma.issueNote.create({
    data: {
      issueNumber: "ISS-001",
      issueDate: new Date("2025-08-16"),
      materialId: cement.id,
      totalQuantity: 20,
      totalAmount: 20 * 350,
      weightedRate: 350,
      items: {
        create: [
          {
            grnId: grn1.id,
            materialId: cement.id,
            quantity: 20,
            rate: 350,
            amount: 20 * 350,
          },
        ],
      },
    },
  });

  await prisma.issueNote.create({
    data: {
      issueNumber: "ISS-002",
      issueDate: new Date("2025-08-17"),
      materialId: steel.id,
      totalQuantity: 10,
      totalAmount: 10 * 50000,
      weightedRate: 50000,
      items: {
        create: [
          {
            grnId: grn2.id,
            materialId: steel.id,
            quantity: 10,
            rate: 50000,
            amount: 10 * 50000,
          },
        ],
      },
    },
  });

  await prisma.issueNote.create({
    data: {
      issueNumber: "ISS-003",
      issueDate: new Date("2025-08-19"),
      materialId: cement.id,
      totalQuantity: 30,
      totalAmount: 30 * 355,
      weightedRate: 355,
      items: {
        create: [
          {
            grnId: grn1.id,
            materialId: cement.id,
            quantity: 10,
            rate: 350,
            amount: 10 * 350,
          },
          {
            grnId: grn4.id,
            materialId: cement.id,
            quantity: 20,
            rate: 360,
            amount: 20 * 360,
          },
        ],
      },
    },
  });

  await prisma.issueNote.create({
    data: {
      issueNumber: "ISS-004",
      issueDate: new Date("2025-08-20"),
      materialId: sand.id,
      totalQuantity: 15,
      totalAmount: 15 * 1200,
      weightedRate: 1200,
      items: {
        create: [
          {
            grnId: grn3.id,
            materialId: sand.id,
            quantity: 15,
            rate: 1200,
            amount: 15 * 1200,
          },
        ],
      },
    },
  });

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
