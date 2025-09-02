// src/components/SkuWidget.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getForecast, getReorder } from "../api/ml";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis, ReferenceLine } from "recharts";

type Reorder = {
  reorder_point: number;
  safety_stock: number;
  daily_mean: number;
  daily_std: number;
  sku_id: string;
  lead_time_days: number;
};

export default function SkuWidget({ initialSku = "Cement" }: { initialSku?: string }) {
  const [sku, setSku] = useState(initialSku);
  const [forecast, setForecast] = useState<number[] | null>(null);
  const [reorder, setReorder] = useState<Reorder | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setErr(""); setForecast(null); setReorder(null);
        const f = await getForecast(sku, 7);
        const r = await getReorder(sku, { leadTimeDays: 5 }); // ✅ fixed

        if (!cancel) { setForecast(f.forecast); setReorder(r); }
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? "Failed to fetch");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [sku]);

  const data = useMemo(
    () => (forecast ?? []).map((y, i) => ({ x: i + 1, y: Number(y.toFixed(2)) })),
    [forecast]
  );

  const kpi = (label: string, value: number | undefined, bold = false) => (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 11, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: bold ? 700 : 600 }}>
        {value != null ? Number(value).toFixed(2) : "—"}
      </div>
    </div>
  );

  return (
    <div style={{
      border: "1px solid #eee",
      borderRadius: 12,
      padding: 12,
      background: "#fff",
      display: "grid",
      gap: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>ML Demand Widget</div>
        <Link to={`/insights`} style={{ fontSize: 12, textDecoration: "underline" }}>
          View details →
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU (e.g., Cement)"
          style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", flex: 1, minWidth: 160 }}
        />
        {loading && <span style={{ fontSize: 12 }}>⏳</span>}
      </div>

      {err && <div style={{ color: "#b00020", fontSize: 12 }}>⚠️ {err}</div>}

      {/* KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8
      }}>
        {kpi("Daily mean", reorder?.daily_mean)}
        {kpi("Safety stock", reorder?.safety_stock)}
        {kpi("Reorder point", reorder?.reorder_point, true)}
      </div>

      {/* Tiny chart (sparkline-style) */}
      <div style={{ height: 140 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip formatter={(v: any) => Number(v).toFixed(2)} labelFormatter={(l) => `Day ${l}`} />
            <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} />
            {reorder && (
              <ReferenceLine y={reorder.reorder_point} strokeDasharray="4 4" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
