// src/components/ReorderBoard.tsx
import React, { useEffect, useMemo, useState } from "react";

type CurrentStockRow = {
  materialId: number; name: string; unit: string; category?: string | null;
  totalRemaining: number; minStockLevel: number; belowMin: boolean;
};

type ReorderResp = {
  sku_id: string;
  lead_time_days: number;
  daily_mean: number;
  daily_std: number;
  safety_stock: number;
  reorder_point: number;
};

type Row = CurrentStockRow & {
  ml?: ReorderResp;
  suggestOrder?: number;
  error?: string;
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// small concurrency gate to avoid flooding server
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0, inFlight = 0;
  return new Promise((resolve, reject) => {
    const next = () => {
      if (i >= items.length && inFlight === 0) return resolve(out);
      while (inFlight < limit && i < items.length) {
        const idx = i++;
        inFlight++;
        fn(items[idx])
          .then((r) => { out[idx] = r; })
          .catch((e) => { out[idx] = e; })
          .finally(() => { inFlight--; next(); });
      }
    };
    next();
  });
}

export default function ReorderBoard({ leadTimeDays = 5, maxShown = 25 }: { leadTimeDays?: number; maxShown?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setErr(""); setRows([]);

        // 1) load current stock (from your backend)
        const stock = await getJSON<CurrentStockRow[]>("/stock/current");

        // 2) call ML reorder for each material name as sku_id (via backend proxy)
        const results = await mapWithLimit(stock, 6, async (s) => {
          try {
            const url = `/api/sku/${encodeURIComponent(s.name)}/reorder?leadTimeDays=${leadTimeDays}`;
            const data = await getJSON<ReorderResp>(url);
            const suggest = Math.max(0, Math.ceil(data.reorder_point - s.totalRemaining));
            return { ...s, ml: data, suggestOrder: suggest } as Row;
          } catch (e: any) {
            return { ...s, error: e?.message || "ML failed" } as Row;
          }
        });

        if (!cancel) setRows(results);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load reorder board");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [leadTimeDays]);

  const sorted = useMemo(() => {
    // rank by highest suggested order first, then by belowMin
    return rows.slice().sort((a, b) => {
      const sa = a.suggestOrder ?? -1, sb = b.suggestOrder ?? -1;
      if (sb !== sa) return sb - sa;
      return (b.belowMin ? 1 : 0) - (a.belowMin ? 1 : 0);
    });
  }, [rows]);

  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Reorder Suggestions (Auto-ML)</div>
        <div style={{ fontSize: 12, opacity: .8 }}>Lead time: <b>{leadTimeDays} days</b></div>
      </div>

      {err && <div style={{ color: "#fca5a5", marginBottom: 8 }}>⚠ {err}</div>}
      {loading && <div>⏳ Computing suggestions…</div>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {["Material", "On hand", "ROP", "Safety", "Suggest Order", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734", letterSpacing: .3 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, maxShown).map((r) => {
                const rop = r.ml?.reorder_point ?? NaN;
                const safety = r.ml?.safety_stock ?? NaN;
                const suggest = r.suggestOrder ?? 0;
                const warn = r.belowMin || suggest > 0;
                return (
                  <tr key={r.materialId}>
                    <td style={tdCell()} title={r.name}>{r.name} <span style={{ opacity:.6 }}>({r.unit})</span></td>
                    <td style={tdCell()}>{r.totalRemaining}</td>
                    <td style={tdCell()}>{isFinite(rop) ? Math.round(rop) : "—"}</td>
                    <td style={tdCell()}>{isFinite(safety) ? Math.round(safety) : "—"}</td>
                    <td style={tdCell({ fontWeight: 700, color: suggest > 0 ? "#93c5fd" : "#9ca3af" })}>
                      {r.error ? "—" : suggest}
                    </td>
                    <td style={tdCell()}>
                      {r.error ? (
                        <span style={pill("#3b1e27", "#fca5a5")}>ML error</span>
                      ) : warn ? (
                        <span style={pill("#2a230b", "#fde68a")}>Action</span>
                      ) : (
                        <span style={pill("#0d2b2b", "#67e8f9")}>OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={6} style={tdCell({ opacity:.7 })}>No materials yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, opacity: .7 }}>
        Notes: ROP = Reorder Point. Suggest Order = max(0, ROP − On hand).
        New materials added later will appear automatically.
      </div>
    </div>
  );
}

function tdCell(extra?: React.CSSProperties): React.CSSProperties {
  return { padding: "10px 14px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.5, ...(extra || {}) };
}
function pill(bg: string, fg: string) {
  return { padding:"3px 8px", borderRadius: 999, fontSize: 12, background: bg, color: fg } as React.CSSProperties;
}
