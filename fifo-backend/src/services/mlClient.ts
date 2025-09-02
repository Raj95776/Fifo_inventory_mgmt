// src/services/mlClient.ts
import axios from "axios";

const ML = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:8088",
  timeout: 8000,
});

export async function mlForecast(skuId: string, horizon = 7) {
  const { data } = await ML.get("/ml/forecast", { params: { sku_id: skuId, horizon } });
  return data as { sku_id: string; start_date: string; horizon: number; forecast: number[] };
}

export async function mlReorder(skuId: string, leadTimeDays = 7, z = 1.65) {
  const { data } = await ML.get("/ml/reorder", { params: { sku_id: skuId, lead_time_days: leadTimeDays, z } });
  return data as { sku_id: string; lead_time_days: number; safety_stock: number; reorder_point: number; suggested_order: number };
}
