import { Router, Request, Response } from "express";
import { mlForecast, mlReorder } from "../services/mlClient";

const r = Router();

// normalize incoming sku to match model labels
const CANON = ["Cement", "Bricks", "Blocks", "Steel"];
function normalizeSku(input: string): string {
  const lower = input.trim().toLowerCase();
  const hit = CANON.find(s => s.toLowerCase() === lower);
  return hit ?? input; // fall back to original if not matched
}

r.get("/api/sku/:skuId/forecast", async (req: Request, res: Response) => {
  try {
    const sku = normalizeSku(String(req.params.skuId || ""));
    const horizon = Number(req.query.horizon ?? 7);
    const data = await mlForecast(sku, horizon);
    res.json(data);
  } catch (e: any) {
    console.error("ML forecast error:", e?.response?.data || e?.message || e);
    res.status(502).json({ error: e?.response?.data || e?.message || "ML forecast failed" });
  }
});

r.get("/api/sku/:skuId/reorder", async (req: Request, res: Response) => {
  try {
    const sku = normalizeSku(String(req.params.skuId || ""));
    const lead = Number(req.query.leadTimeDays ?? 7);
    const z = Number(req.query.z ?? 1.65);
    const data = await mlReorder(sku, lead, z);
    res.json(data);
  } catch (e: any) {
    console.error("ML reorder error:", e?.response?.data || e?.message || e);
    res.status(502).json({ error: e?.response?.data || e?.message || "ML reorder failed" });
  }
});

export default r;
