// src/components/SkuInsights.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getForecast, getReorder } from "../api/ml";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  ReferenceLine
} from "recharts";

type ReorderResp = {
  sku_id: string;
  lead_time_days: number;
  daily_mean: number;
  daily_std: number;
  safety_stock: number;
  reorder_point: number;
};

function nextNDates(n: number, start?: Date) {
  const base = start ? new Date(start) : new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i + 1); // forecast is for future days
    return d.toISOString().slice(0, 10);
  });
}

export default function SkuInsights() {
  const [sku, setSku] = useState("Cement");
  const [horizon, setHorizon] = useState(7);
  const [lead, setLead] = useState(5);

  const [forecast, setForecast] = useState<number[] | null>(null);
  const [reorder, setReorder] = useState<ReorderResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        setForecast(null);
        setReorder(null);
        const f = await getForecast(sku, horizon);
        if (!cancel) setForecast(f.forecast);
        const r = await getReorder(sku, { leadTimeDays: lead }); // ✅ fixed
        if (!cancel) setReorder(r);
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? "Failed to fetch");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [sku, horizon, lead]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    const dates = nextNDates(forecast.length);
    return dates.map((date, i) => ({
      date,
      qty: Number(forecast[i].toFixed(2))
    }));
  }, [forecast]);

  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "1px solid #eee", background: "#fff" }}>
      <h2 style={{ marginTop: 0 }}>SKU Insights</h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label>
          <span style={{ fontSize: 13, color: "#555" }}>SKU&nbsp;</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g., Cement"
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", minWidth: 180 }}
          />
        </label>

        <label>
          <span style={{ fontSize: 13, color: "#555" }}>Horizon (days)&nbsp;</span>
          <input
            type="number"
            min={3}
            max={30}
            value={horizon}
            onChange={(e) => setHorizon(Math.max(3, Math.min(30, Number(e.target.value) || 7)))}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 90 }}
          />
        </label>

        <label>
          <span style={{ fontSize: 13, color: "#555" }}>Lead time (days)&nbsp;</span>
          <input
            type="number"
            min={1}
            max={30}
            value={lead}
            onChange={(e) => setLead(Math.max(1, Math.min(30, Number(e.target.value) || 5)))}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 90 }}
          />
        </label>
      </div>

      {err && <div style={{ color: "#b00020", marginBottom: 12 }}>⚠️ {err}</div>}
      {loading && <div style={{ marginBottom: 12 }}>⏳ loading…</div>}

      {/* KPI cards */}
      {reorder && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Kpi title="Daily mean" value={reorder.daily_mean} />
          <Kpi title="Daily std" value={reorder.daily_std} />
          <Kpi title="Safety stock" value={reorder.safety_stock} />
          <Kpi title="Reorder point" value={reorder.reorder_point} highlight />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ height: 320, width: "100%" }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="qty" dot={false} strokeWidth={2} />
              {reorder && (
                <ReferenceLine
                  y={reorder.reorder_point}
                  label={{ value: "ROP", position: "insideTopRight", fill: "#555" }}
                  stroke="#888"
                  strokeDasharray="4 4"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Raw debug (collapsible) */}
      <details style={{ marginTop: 12 }}>
        <summary>Debug payloads</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify({ forecast, reorder }, null, 2)}</pre>
      </details>
    </div>
  );
}

function Kpi({ title, value, highlight = false }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      border: "1px solid #eee",
      borderRadius: 12,
      padding: 12,
      background: highlight ? "#f6fbff" : "#fafafa"
    }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{Number(value || 0).toFixed(2)}</div>
    </div>
  );
}
