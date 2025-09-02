// src/api/ml.ts
export async function getForecast(sku: string, horizon = 7) {
  const res = await fetch(`/api/sku/${encodeURIComponent(sku)}/forecast?horizon=${horizon}`);
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
  return res.json(); // { sku_id, start_date, horizon, forecast: number[] }
}

export async function getReorder(sku: string, opts?: { leadTimeDays?: number; z?: number; onHand?: number }) {
  const lead = opts?.leadTimeDays ?? 7;
  const z = opts?.z ?? 1.65;
  const onHandQS = opts?.onHand != null ? `&onHand=${encodeURIComponent(String(opts.onHand))}` : "";
  const url = `/api/sku/${encodeURIComponent(sku)}/reorder?leadTimeDays=${lead}&z=${z}${onHandQS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reorder failed: ${res.status}`);
  return res.json(); // { reorder_point, safety_stock, daily_mean, daily_std, suggested_order? }
}
