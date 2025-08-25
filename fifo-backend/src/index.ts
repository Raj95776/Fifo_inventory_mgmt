import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

const app = express();
const port = 4000;
const prisma = new PrismaClient();

// allow frontend requests from port 3000
app.use(cors({ origin: "http://localhost:3000" }));
app.use(bodyParser.json());

// ------------------ HEALTH CHECK ------------------
app.get("/", (req: Request, res: Response) => {
  // same route, just warmer copy
  res.send(" FIFO Backend API is up and running with the database connected. 🚀");
});

// Small helpers
const isValidDate = (value: any) => !isNaN(Date.parse(value));
const toInt = (v: any) => (v === undefined || v === null ? undefined : Number(v));

// ------------------ MATERIALS ------------------

// Create Material
app.post("/materials", async (req: Request, res: Response) => {
  try {
    const { name, description, unit, category, minStockLevel } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ error: "Name and unit are required." });
    }
    if (minStockLevel != null && Number(minStockLevel) < 0) {
      return res.status(400).json({ error: "minStockLevel must be ≥ 0." });
    }

    const material = await prisma.material.create({
      data: {
        name,
        description,
        unit,
        category,
        minStockLevel: Number(minStockLevel) || 0,
        isActive: true,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    console.error(" Create material error:", error);
    res.status(500).json({ error: "Failed to create material." });
  }
});

// Get materials (active by default; pass ?all=1 or ?includeInactive=1 to get all)
app.get("/materials", async (req: Request, res: Response) => {
  try {
    const { all, includeInactive } = req.query as { all?: string; includeInactive?: string };

    const where =
      all === "1" || includeInactive === "1"
        ? {}
        : { isActive: true };

    const materials = await prisma.material.findMany({ where });
    res.json(materials);
  } catch (error) {
    console.error(" List materials error:", error);
    res.status(500).json({ error: "Failed to fetch materials." });
  }
});

// Get single material by ID
app.get("/materials/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid material id." });

    const material = await prisma.material.findUnique({
      where: { id },
      include: { grns: true, issueItems: true },
    });

    if (!material || !material.isActive) {
      return res.status(404).json({ error: "Material not found." });
    }

    res.json(material);
  } catch (error) {
    console.error(" Get material error:", error);
    res.status(500).json({ error: "Failed to fetch material." });
  }
});

// Update material
app.put("/materials/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid material id." });

    const { name, description, unit, category, minStockLevel } = req.body;
    if (minStockLevel != null && Number(minStockLevel) < 0) {
      return res.status(400).json({ error: "minStockLevel must be ≥ 0." });
    }

    const material = await prisma.material.update({
      where: { id },
      data: {
        name,
        description,
        unit,
        category,
        minStockLevel: toInt(minStockLevel),
      },
    });

    if (!material.isActive) {
      return res.status(400).json({ error: "Cannot update a deleted material." });
    }

    res.json(material);
  } catch (error: any) {
    console.error(" Update material error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "Material not found." });
    }
    res.status(500).json({ error: "Failed to update material." });
  }
});

// Soft delete material
app.delete("/materials/:id", async (req: Request, res: Response) => {
  try {
    const materialId = Number(req.params.id);
    if (!materialId) return res.status(400).json({ error: "Invalid material id." });

    const material = await prisma.material.update({
      where: { id: materialId },
      data: { isActive: false },
    });

    res.json({ message: "Material deleted (soft delete).", material });
  } catch (error: any) {
    console.error(" Delete material error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "Material not found." });
    }
    res.status(500).json({ error: "Failed to delete material." });
  }
});

// ---- Restore Material (undo soft delete)
app.put("/materials/:id/restore", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid material id." });

    const updated = await prisma.material.update({
      where: { id },
      data: { isActive: true },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error(" Restore material error:", e);
    if (String(e.code) === "P2025") {
      return res.status(404).json({ error: "Material not found." });
    }
    return res.status(500).json({ error: "Failed to restore material." });
  }
});

// ------------------ GRNS (Goods Received Notes) ------------------

// Create GRN
app.post("/grns", async (req: Request, res: Response) => {
  try {
    const { materialId, quantity, rate, grnNumber, supplierName, receivedDate } = req.body;

    if (!materialId || !quantity || !rate || !grnNumber || !supplierName || !receivedDate) {
      return res.status(400).json({
        error:
          "materialId, quantity, rate, grnNumber, supplierName, and receivedDate are required.",
      });
    }
    if (Number(quantity) <= 0 || Number(rate) <= 0) {
      return res.status(400).json({ error: "quantity and rate must be > 0." });
    }
    if (!isValidDate(receivedDate)) {
      return res.status(400).json({ error: "receivedDate must be a valid date (YYYY-MM-DD)." });
    }

    const grn = await prisma.grn.create({
      data: {
        materialId: Number(materialId),
        quantity: Number(quantity),
        rate: Number(rate),
        grnNumber,
        supplierName,
        receivedDate: new Date(receivedDate),
        remaining: Number(quantity),
        amount: Number(quantity) * Number(rate),
        isActive: true,
      },
    });

    res.status(201).json(grn);
  } catch (error) {
    console.error(" Create GRN error:", error);
    res.status(500).json({ error: "Failed to create GRN." });
  }
});

// Get all active GRNs
app.get("/grns", async (req: Request, res: Response) => {
  try {
    const grns = await prisma.grn.findMany({
      where: { isActive: true },
      include: { material: true },
    });
    res.json(grns);
  } catch (error) {
    console.error("List GRNs error:", error);
    res.status(500).json({ error: "Failed to fetch GRNs." });
  }
});

// Get single GRN by ID
app.get("/grns/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid GRN id." });

    const grn = await prisma.grn.findUnique({
      where: { id },
      include: { material: true, issueItems: true },
    });

    if (!grn || !grn.isActive) {
      return res.status(404).json({ error: "GRN not found." });
    }

    res.json(grn);
  } catch (error) {
    console.error(" Get GRN error:", error);
    res.status(500).json({ error: "Failed to fetch GRN." });
  }
});

// Update GRN (protect remaining from going below already-issued)
app.put("/grns/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid GRN id." });

    const { quantity, rate, grnNumber, supplierName, receivedDate } = req.body;

    if (!quantity || !rate || !grnNumber || !supplierName || !receivedDate) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (Number(quantity) <= 0 || Number(rate) <= 0) {
      return res.status(400).json({ error: "quantity and rate must be > 0." });
    }
    if (!isValidDate(receivedDate)) {
      return res.status(400).json({ error: "receivedDate must be a valid date (YYYY-MM-DD)." });
    }

    const existing = await prisma.grn.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "GRN not found." });

    const alreadyIssued = existing.quantity - existing.remaining; // qty already taken by issues
    if (Number(quantity) < alreadyIssued) {
      return res
        .status(400)
        .json({ error: `quantity cannot be less than already issued (${alreadyIssued}).` });
    }
    const newRemaining = Number(quantity) - alreadyIssued;

    const grn = await prisma.grn.update({
      where: { id },
      data: {
        quantity: Number(quantity),
        rate: Number(rate),
        grnNumber,
        supplierName,
        receivedDate: new Date(receivedDate),
        amount: Number(quantity) * Number(rate),
        remaining: newRemaining,
      },
    });

    if (!grn.isActive) {
      return res.status(400).json({ error: "Cannot update a deleted GRN." });
    }

    res.json(grn);
  } catch (error: any) {
    console.error("Update GRN error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "GRN not found." });
    }
    res.status(500).json({ error: "Failed to update GRN." });
  }
});

// Soft delete GRN
app.delete("/grns/:id", async (req: Request, res: Response) => {
  try {
    const grnId = Number(req.params.id);
    if (!grnId) return res.status(400).json({ error: "Invalid GRN id." });

    const grn = await prisma.grn.update({
      where: { id: grnId },
      data: { isActive: false },
    });

    res.json({ message: "GRN deleted (soft delete).", grn });
  } catch (error: any) {
    console.error(" Delete GRN error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "GRN not found." });
    }
    res.status(500).json({ error: "Failed to delete GRN." });
  }
});

// ---- Restore GRN (undo soft delete)
app.put("/grns/:id/restore", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid GRN id." });

    const updated = await prisma.grn.update({
      where: { id },
      data: { isActive: true },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error("Restore GRN error:", e);
    if (String(e.code) === "P2025") {
      return res.status(404).json({ error: "GRN not found." });
    }
    return res.status(500).json({ error: "Failed to restore GRN." });
  }
});

// ------------------ ISSUE NOTES ------------------

// Create Issue Note (FIFO issuance)
app.post("/issue-notes", async (req: Request, res: Response) => {
  try {
    const { materialId, quantity, issueNumber, issueDate } = req.body;

    if (!materialId || !quantity || !issueNumber || !issueDate) {
      return res.status(400).json({
        error: "materialId, quantity, issueNumber, and issueDate are required.",
      });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ error: "quantity must be > 0." });
    }
    if (!isValidDate(issueDate)) {
      return res.status(400).json({ error: "issueDate must be a valid date (YYYY-MM-DD)." });
    }

    let remainingQty = Number(quantity);
    const issuedFromGRNs: Array<{ grnId: number; taken: number; rate: number }> = [];

    // Fetch GRNs for this material ordered by receivedDate (FIFO)
    const grns = await prisma.grn.findMany({
      where: { materialId: Number(materialId), remaining: { gt: 0 }, isActive: true },
      orderBy: { receivedDate: "asc" },
    });

    for (const grn of grns) {
      if (remainingQty <= 0) break;
      const takeQty = Math.min(grn.remaining, remainingQty);
      remainingQty -= takeQty;

      // Update GRN remaining
      await prisma.grn.update({
        where: { id: grn.id },
        data: { remaining: grn.remaining - takeQty },
      });

      issuedFromGRNs.push({
        grnId: grn.id,
        taken: takeQty,
        rate: grn.rate,
      });
    }

    if (remainingQty > 0) {
      return res.status(400).json({
        error: "Not enough stock available (FIFO).",
        requested: Number(quantity),
        unfulfilled: remainingQty,
      });
    }

    // Calculate totals
    const totalAmount = issuedFromGRNs.reduce((sum, item) => sum + item.taken * item.rate, 0);
    const weightedRate = totalAmount / Number(quantity);

    // Create IssueNote header
    const issueNote = await prisma.issueNote.create({
      data: {
        materialId: Number(materialId),
        issueNumber,
        issueDate: new Date(issueDate),
        totalQuantity: Number(quantity),
        totalAmount,
        weightedRate,
      },
    });

    // Create IssueItems (details linked to GRNs)
    for (const item of issuedFromGRNs) {
      await prisma.issueItem.create({
        data: {
          issueNoteId: issueNote.id,
          grnId: item.grnId,
          materialId: Number(materialId),
          quantity: item.taken,
          rate: item.rate,
          amount: item.taken * item.rate,
        },
      });
    }

    res.status(201).json({ issueNote, issuedFromGRNs });
  } catch (error) {
    console.error("Create Issue Note error:", error);
    res.status(500).json({ error: "Failed to create Issue Note." });
  }
});

// List issue notes
app.get("/issue-notes", async (req: Request, res: Response) => {
  try {
    const issueNotes = await prisma.issueNote.findMany({
      include: { items: true, material: true },
    });
    res.json(issueNotes);
  } catch (error) {
    console.error("List Issue Notes error:", error);
    res.status(500).json({ error: "Failed to fetch Issue Notes." });
  }
});

// Get single issue note
app.get("/issue-notes/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid issue note id." });

    const note = await prisma.issueNote.findUnique({
      where: { id },
      include: { items: true, material: true },
    });
    if (!note) return res.status(404).json({ error: "Issue Note not found." });
    res.json(note);
  } catch (error) {
    console.error(" Get Issue Note error:", error);
    res.status(500).json({ error: "Failed to fetch Issue Note." });
  }
});

// Update Issue Note (header-only fields)
app.put("/issue-notes/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid issue note id." });

    const { issueNumber, issueDate } = req.body;
    if (issueDate && !isValidDate(issueDate)) {
      return res.status(400).json({ error: "issueDate must be a valid date (YYYY-MM-DD)." });
    }

    const note = await prisma.issueNote.update({
      where: { id },
      data: {
        issueNumber,
        issueDate: issueDate ? new Date(issueDate) : undefined,
      },
      include: { items: true, material: true },
    });

    res.json(note);
  } catch (error: any) {
    console.error("Update Issue Note error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "Issue Note not found." });
    }
    res.status(500).json({ error: "Failed to update Issue Note." });
  }
});

// Delete Issue Note (hard delete with cascade to items)
app.delete("/issue-notes/:id", async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.id);
    if (!noteId) return res.status(400).json({ error: "Invalid issue note id." });

    await prisma.issueItem.deleteMany({ where: { issueNoteId: noteId } });
    await prisma.issueNote.delete({ where: { id: noteId } });

    res.json({ message: "Issue Note deleted successfully." });
  } catch (error: any) {
    console.error(" Delete Issue Note error:", error);
    if (String(error.code) === "P2025") {
      return res.status(404).json({ error: "Issue Note not found." });
    }
    res.status(500).json({ error: "Failed to delete Issue Note." });
  }
});

// ---- Issue Note PREVIEW (no DB writes)
app.post("/issue-notes/preview", async (req: Request, res: Response) => {
  try {
    const { materialId, quantity } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({ error: "materialId and quantity are required." });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ error: "quantity must be > 0." });
    }

    let remainingQty = Number(quantity);

    // FIFO GRNs (only active with remaining > 0)
    const grns = await prisma.grn.findMany({
      where: { materialId: Number(materialId), remaining: { gt: 0 }, isActive: true },
      orderBy: { receivedDate: "asc" },
      include: { material: true },
    });

    const breakdown: Array<{
      grnId: number;
      grnNumber: string;
      takeQty: number;
      rate: number;
      amount: number;
      receivedDate: Date;
    }> = [];

    for (const grn of grns) {
      if (remainingQty <= 0) break;
      const takeQty = Math.min(grn.remaining, remainingQty);
      remainingQty -= takeQty;

      breakdown.push({
        grnId: grn.id,
        grnNumber: grn.grnNumber,
        takeQty,
        rate: grn.rate,
        amount: takeQty * grn.rate,
        receivedDate: grn.receivedDate,
      });
    }

    if (remainingQty > 0) {
      return res.status(400).json({
        error: "Not enough stock available (FIFO).",
        requested: Number(quantity),
        unfulfilled: remainingQty,
      });
    }

    const totalAmount = breakdown.reduce((s, b) => s + b.amount, 0);
    const weightedRate = totalAmount / Number(quantity);

    return res.json({
      materialId: Number(materialId),
      requestedQty: Number(quantity),
      breakdown,
      totalAmount,
      weightedRate,
    });
  } catch (err) {
    console.error(" Preview Issue Note error:", err);
    res.status(500).json({ error: "Failed to preview Issue Note." });
  }
});

// ------------------ REPORTS ------------------
app.get("/reports", async (req: Request, res: Response) => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        grns: true,
        issueItems: { include: { issueNote: true } },
      },
    });

    const reports = materials.map((m) => {
      const totalReceived = m.grns.reduce((sum, g) => sum + g.quantity, 0);
      const totalRemaining = m.grns.reduce((sum, g) => sum + g.remaining, 0);
      const totalIssued = m.issueItems.reduce((sum, i) => sum + i.quantity, 0);

      return {
        materialId: m.id,
        name: m.name,
        unit: m.unit,
        category: m.category,
        totalReceived,
        totalIssued,
        totalRemaining,
        minStockLevel: m.minStockLevel,
        belowMin: totalRemaining < m.minStockLevel,
      };
    });

    res.json(reports);
  } catch (error: any) {
    console.error(" Reports error:", error);
    res.status(500).json({ error: "Failed to generate report.", details: error.message });
  }
});

// ------------------ STOCK REPORTS ------------------

// 1. Current Stock Report
app.get("/stock/current", async (req: Request, res: Response) => {
  try {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: { grns: true, issueItems: true },
    });

    const report = materials.map((m) => {
      const totalReceived = m.grns.reduce((sum, g) => sum + g.quantity, 0);
      const totalRemaining = m.grns.reduce((sum, g) => sum + g.remaining, 0);
      const totalIssued = m.issueItems.reduce((sum, i) => sum + i.quantity, 0);

      return {
        materialId: m.id,
        name: m.name,
        unit: m.unit,
        category: m.category,
        totalReceived,
        totalIssued,
        totalRemaining,
        minStockLevel: m.minStockLevel,
        belowMin: totalRemaining < m.minStockLevel,
      };
    });

    res.json(report);
  } catch (error) {
    console.error(" Current stock error:", error);
    res.status(500).json({ error: "Failed to fetch current stock." });
  }
});

// 2. Stock Movements Report (GRNs + Issues sorted by date) with server-side filtering
app.get("/stock/movements", async (req: Request, res: Response) => {
  try {
    const { materialId, start, end } = req.query as {
      materialId?: string;
      start?: string;
      end?: string;
    };

    // Build date filters
    const dateFrom = start ? new Date(start) : undefined;
    const dateTo = end ? new Date(end + "T23:59:59.999Z") : undefined;

    // Build material filter
    const matId = materialId ? Number(materialId) : undefined;

    // GRNs
    const grns = await prisma.grn.findMany({
      where: {
        isActive: true,
        ...(matId ? { materialId: matId } : {}),
        ...(dateFrom || dateTo
          ? {
              receivedDate: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      include: { material: true },
    });

    // IssueNotes
    const issues = await prisma.issueNote.findMany({
      where: {
        ...(matId ? { materialId: matId } : {}),
        ...(dateFrom || dateTo
          ? {
              issueDate: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      include: { material: true },
    });

    const movements = [
      ...grns.map((g) => ({
        type: "GRN" as const,
        material: g.material.name,
        materialId: g.materialId,
        date: g.receivedDate,
        quantity: g.quantity,
        rate: g.rate,
        amount: g.amount,
        reference: g.grnNumber,
        supplier: g.supplierName,
      })),
      ...issues.map((i) => ({
        type: "ISSUE" as const,
        material: i.material.name,
        materialId: i.materialId,
        date: i.issueDate,
        quantity: i.totalQuantity,
        rate: i.weightedRate,
        amount: i.totalAmount,
        reference: i.issueNumber,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json(movements);
  } catch (error) {
    console.error("Stock movements error:", error);
    res.status(500).json({ error: "Failed to fetch stock movements." });
  }
});

// 3. Stock Valuation Report
app.get("/stock/valuation", async (req: Request, res: Response) => {
  try {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: { grns: true },
    });

    const valuation = materials.map((m) => {
      const totalRemaining = m.grns.reduce((sum, g) => sum + g.remaining, 0);

      // weighted average rate = total value of remaining stock ÷ remaining qty
      const totalValue = m.grns.reduce((sum, g) => sum + g.remaining * g.rate, 0);
      const weightedRate = totalRemaining > 0 ? totalValue / totalRemaining : 0;

      return {
        materialId: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        remainingQuantity: totalRemaining,
        weightedRate,
        valuation: totalValue,
      };
    });

    res.json(valuation);
  } catch (error) {
    console.error("Stock valuation error:", error);
    res.status(500).json({ error: "Failed to fetch stock valuation." });
  }
});

// ------------------ START SERVER ------------------
app.listen(port, () => {
  console.log(` Server running on http://localhost:${port}`);
});
