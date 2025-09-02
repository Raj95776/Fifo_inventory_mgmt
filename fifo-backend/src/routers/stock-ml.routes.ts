// src/routers/stock-ml.routes.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { mlForecast, mlReorder } from "../services/mlClient";

const prisma = new PrismaClient();
const r = Router();

/** If your ML was trained on specific canonical SKU casing, normalize here. */
const CANON = ["Cement", "Bricks", "Blocks", "Steel"];
const SKU_ALIAS: Record<string, string> = {
  // add any custom mappings here if your DB material names differ from ML sku_id
  // e.g. "TMT Steel": "Steel", "PPC Cement": "Cement"
};
function normalizeSku(input: string): string {
  const byAlias = SKU_ALIAS[input];
  if (byAlias) return byAlias;
  const lower = input.trim().toLowerCase();
  const hit = CANON.find(s => s.toLowerCase() === lower);
  return hit ?? input; // fallback: pass through as-is
}

/**
 * GET /stock/with-ml
 * Combines current stock (from DB) with ML reorder + short forecast per material.
 * Query params:
 *   leadTimeDays (default 7)
 *   z            (default 1.65)
 *   horizon      (default 7) -- for preview forecast
 */
r.get("/stock/with-ml", async (req: Request, res: Response) => {
  try {
    const leadTimeDays = Number(req.query.leadTimeDays ?? 7);
    const z = Number(req.query.z ?? 1.65);
    const horizon = Number(req.query.horizon ?? 7);

    // Pull materials and their stock picture
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: { grns: true, issueItems: true },
    });

    // Shape DB stock
    const rows = materials.map((m) => {
      const totalReceived = m.grns.reduce((s, g) => s + g.quantity, 0);
      const totalRemaining = m.grns.reduce((s, g) => s + g.remaining, 0);
      const totalIssued = m.issueItems.reduce((s, i) => s + i.quantity, 0);
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

    // Call ML per material (don’t let one failure kill the whole response)
    const enriched = await Promise.allSettled(
      rows.map(async (row) => {
        const sku = normalizeSku(row.name);
        const [reorder, fc] = await Promise.all([
          mlReorder(sku, leadTimeDays, z).catch((e) => ({ error: e?.message || "reorder failed" })),
          mlForecast(sku, horizon).catch((e) => ({ error: e?.message || "forecast failed" })),
        ]);

        // safe unpack
        const fcArr = (fc as any)?.forecast as number[] | undefined;
        const next7Total = Array.isArray(fcArr) ? fcArr.reduce((s, v) => s + (Number(v) || 0), 0) : null;

        const ro = reorder as any;
        return {
          ...row,
          ml: {
            sku_used: sku,
            leadTimeDays,
            z,
            forecast: Array.isArray(fcArr) ? fcArr : null,
            forecastSum: next7Total,
            safetyStock: ro?.safety_stock ?? null,
            reorderPoint: ro?.reorder_point ?? null,
            suggestedOrder: ro?.suggested_order ?? null,
            errors: {
              forecast: (fc as any)?.error ?? null,
              reorder: ro?.error ?? null,
            },
          },
        };
      })
    );

    // Flatten results
    const data = enriched.map((p, i) => (p.status === "fulfilled" ? p.value : { ...rows[i], ml: { errors: { internal: (p as any).reason } } }));

    res.json({ count: data.length, items: data });
  } catch (e: any) {
    console.error("stock/with-ml error:", e);
    res.status(500).json({ error: "Failed to combine stock with ML", details: e?.message });
  }
});

/**
 * GET /materials/:id/with-ml
 * Single material view with ML summary.
 */
r.get("/materials/:id/with-ml", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const leadTimeDays = Number(req.query.leadTimeDays ?? 7);
    const z = Number(req.query.z ?? 1.65);
    const horizon = Number(req.query.horizon ?? 7);

    const m = await prisma.material.findUnique({
      where: { id },
      include: { grns: true, issueItems: true },
    });
    if (!m) return res.status(404).json({ error: "Material not found" });

    const totalReceived = m.grns.reduce((s, g) => s + g.quantity, 0);
    const totalRemaining = m.grns.reduce((s, g) => s + g.remaining, 0);
    const totalIssued = m.issueItems.reduce((s, i) => s + i.quantity, 0);

    const base = {
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

    const sku = normalizeSku(m.name);
    const [reorder, fc] = await Promise.all([
      mlReorder(sku, leadTimeDays, z).catch((e) => ({ error: e?.message || "reorder failed" })),
      mlForecast(sku, horizon).catch((e) => ({ error: e?.message || "forecast failed" })),
    ]);

    const fcArr = (fc as any)?.forecast as number[] | undefined;
    const nextTot = Array.isArray(fcArr) ? fcArr.reduce((s, v) => s + (Number(v) || 0), 0) : null;
    const ro = reorder as any;

    return res.json({
      ...base,
      ml: {
        sku_used: sku,
        leadTimeDays,
        z,
        forecast: Array.isArray(fcArr) ? fcArr : null,
        forecastSum: nextTot,
        safetyStock: ro?.safety_stock ?? null,
        reorderPoint: ro?.reorder_point ?? null,
        suggestedOrder: ro?.suggested_order ?? null,
        errors: {
          forecast: (fc as any)?.error ?? null,
          reorder: ro?.error ?? null,
        },
      },
    });
  } catch (e: any) {
    console.error("materials/:id/with-ml error:", e);
    res.status(500).json({ error: "Failed to load material with ML", details: e?.message });
  }
});

export default r;
