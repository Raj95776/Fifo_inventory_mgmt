// src/components/ReorderPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { getReorder } from "../api/ml";

type CurrentStockRow = {
  materialId: number;
  name: string;
  unit: string;
  category?: string | null;
  totalRemaining: number;
  minStockLevel: number;
  belowMin: boolean;
};

type Row = CurrentStockRow & {
  loading: boolean;
  error?: string;
  reorder_point?: number;
  safety_stock?: number;
  suggested_order?: number | null;
  daily_mean?: number;
  daily_std?: number;
};

const card: React.CSSProperties = { background: "linear-gradient(180deg,#121734,#0d1228)", border: "1px solid #1a2040", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: 18 };
const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734" };
const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb" };

export default function ReorderPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // 1) load current stock from backend
        const res = await api.get<CurrentStockRow[]>("/stock/current");
        const baseRows: Row[] = res.data.map(r => ({ ...r, loading: true }));
        setRows(baseRows);

        // 2) for each material, ask backend → ML for reorder using onHand = totalRemaining
        const concurrency = 5;
        let i = 0;

        // ✅ arrow function inside block (OK in strict mode)
        const nextBatch = async (): Promise<void> => {
          const batch = baseRows.slice(i, i + concurrency);
          i += concurrency;
          await Promise.all(
            batch.map(async (r) => {
              try {
                const data = await getReorder(r.name, { leadTimeDays: 7, z: 1.65, onHand: r.totalRemaining });
                setRows(prev => prev.map(p => p.materialId === r.materialId ? {
                  ...p,
                  loading: false,
                  reorder_point: data.reorder_point,
                  safety_stock: data.safety_stock,
                  suggested_order: data.suggested_order ?? Math.max(0, data.reorder_point - r.totalRemaining),
                  daily_mean: data.daily_mean,
                  daily_std: data.daily_std,
                } : p));
              } catch (e: any) {
                setRows(prev => prev.map(p => p.materialId === r.materialId ? { ...p, loading: false, error: e.message || "ML error" } : p));
              }
            })
          );
          if (i < baseRows.length) {
            await nextBatch();
          }
        };

        await nextBatch();
      } catch (e: any) {
        setErr(e?.message || "Failed to load reorder suggestions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSuggest = useMemo(() => rows.reduce((s, r) => s + (r.suggested_order ?? 0), 0), [rows]);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Reorder Suggestions</h3>
        <div style={{ opacity: .75, fontSize: 13 }}>Total suggested qty: <b>{totalSuggest.toLocaleString()}</b></div>
      </div>

      {err && <div style={{ color: "#fca5a5", marginBottom: 8 }}>⚠ {err}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              {["Material", "On hand", "ROP", "Safety", "Mean±Std", "Suggested"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={6} style={td}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ ...td, opacity: .7 }}>No materials yet.</td></tr>
            ) : (
              rows
                .slice()
                .sort((a, b) => (b.suggested_order ?? 0) - (a.suggested_order ?? 0))
                .map(r => (
                  <tr key={r.materialId}>
                    <td style={td}>{r.name} <span style={{ opacity: .6 }}>({r.unit})</span></td>
                    <td style={td}>{r.totalRemaining.toLocaleString()}</td>
                    <td style={td}>{r.loading ? "…" : (r.reorder_point ?? "—")}</td>
                    <td style={td}>{r.loading ? "…" : (r.safety_stock ?? "—")}</td>
                    <td style={td}>
                      {r.loading ? "…" :
                        (r.daily_mean != null && r.daily_std != null
                          ? `${Math.round(r.daily_mean)} ± ${Math.round(r.daily_std)}`
                          : "—")}
                    </td>
                    <td style={td}>
                      {r.error ? <span style={{ color: "#fca5a5" }}>ML error</span>
                        : r.loading ? "…" :
                          <b style={{ color: (r.suggested_order ?? 0) > 0 ? "#fde68a" : "#93c5fd" }}>
                            {r.suggested_order?.toLocaleString() ?? "—"}
                          </b>}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
