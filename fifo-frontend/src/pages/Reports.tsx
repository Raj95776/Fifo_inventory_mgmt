// src/pages/Reports.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

/* ---------- Types ---------- */
type Material = { id: number; name: string; unit: string; category?: string | null };

type CurrentStockRow = {
  materialId: number; name: string; unit: string; category?: string | null;
  totalReceived: number; totalIssued: number; totalRemaining: number;
  minStockLevel: number; belowMin: boolean;
};

type Movement = {
  type: "GRN" | "ISSUE"; material: string; materialId: number; date: string;
  quantity: number; rate: number; amount: number; reference: string; supplier?: string;
};

type ValuationRow = {
  materialId: number; name: string; category?: string | null; unit: string;
  remainingQuantity: number; weightedRate: number; valuation: number;
};

/* ---------- Styles (dark / glass) ---------- */
const page: React.CSSProperties = { minHeight:"100vh", background:"#0b1020", padding:24, color:"#e5e7eb" };
const header: React.CSSProperties = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 };
const btnGhost: React.CSSProperties = { padding:"10px 14px", borderRadius:12, border:"1px solid #2a2f45", background:"transparent", color:"#cbd5e1", cursor:"pointer", transition:"all .2s ease" };
const btnGreen: React.CSSProperties = { padding:"10px 14px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"#fff", cursor:"pointer", fontWeight:600, boxShadow:"0 6px 16px rgba(16,185,129,.25)", transition:"transform .08s ease" };
const tabsRow: React.CSSProperties = { display:"flex", gap:8, borderBottom:"1px solid #1a2040", marginBottom:12, flexWrap:"wrap" };
const tabBtn = (active:boolean):React.CSSProperties => ({
  padding:"10px 14px", borderRadius:10, border:"1px solid #1a2040",
  background: active ? "linear-gradient(180deg,#1a1f3d,#111632)" : "transparent",
  color:"#e5e7eb", cursor:"pointer", fontWeight: active?700:600, opacity: active?1:.85
});
const panel: React.CSSProperties = { background:"linear-gradient(180deg,#121734,#0d1228)", border:"1px solid #1a2040", borderRadius:16, boxShadow:"0 12px 30px rgba(0,0,0,.35)", padding:18 };
const glass: React.CSSProperties = { background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:16, padding:18 };
const th: React.CSSProperties = { textAlign:"left", padding:"12px 14px", borderBottom:"1px solid #1f2545", fontSize:12, fontWeight:700, color:"#94a3b8", background:"#121734", letterSpacing:.3 };
const td: React.CSSProperties = { padding:"10px 14px", borderBottom:"1px solid #1f2545", fontSize:13.5, color:"#e5e7eb", lineHeight:1.5 };
const input: React.CSSProperties = { padding:10, borderRadius:10, border:"1px solid #2a2f45", background:"#0b1020", color:"#e5e7eb" };

/* Small interaction polish */
const hoverify = (style: React.CSSProperties): React.CSSProperties => ({
  ...style,
  outline:"none"
});

/* ---------- Display helpers ---------- */
const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString()}`;
const makeShortLabel = (name: string, unit?: string | null, max = 16) => {
  const base = unit ? `${name} (${unit})` : name;
  return base.length > max ? `${base.slice(0, max - 1)}…` : base;
};
const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1).replace(/\.0$/,"")}b`;
  if (abs >= 1_000_000) return `${(n/1_000_000).toFixed(1).replace(/\.0$/,"")}m`;
  if (abs >= 1_000) return `${(n/1_000).toFixed(1).replace(/\.0$/,"")}k`;
  return `${n}`;
};

/* ---------- Tiny SVG Charts (no deps) ---------- */
function BarChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  // layout
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = 28;              // narrow bar width
  const gap = 20;             // a bit tighter spacing
  const leftPad = 10;
  const rightPad = 10;
  const base = height - 28;   // reserve bottom for labels
  const w = Math.max(320, leftPad + rightPad + data.length * (bw + gap));

  // grid lines (4 steps)
  const steps = 4;
  const gridYs = Array.from({length: steps+1}, (_,i)=> base - (i/steps)*(base-14));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bar chart">
      <rect x={0} y={0} width={w} height={height} fill="transparent" />

      {/* soft grid */}
      {gridYs.map((gy, i)=>(
        <line key={i} x1={leftPad} y1={gy} x2={w-rightPad} y2={gy} stroke="#263056" strokeWidth={1} opacity={0.35} />
      ))}

      {data.map((d, i) => {
        const h = (d.value / max) * (base - 12);
        const x = leftPad + i * (bw + gap);
        const y = base - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx={7} fill="url(#gradBar)" />
            {/* value (compact) just above bar */}
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#e5e7eb">{compact(Math.round(d.value))}</text>
            {/* angled label + tooltip */}
            <g transform={`translate(${x + bw / 2}, ${base + 12}) rotate(-28)`}>
              <text textAnchor="end" fontSize="10" fill="#94a3b8">
                <tspan>{d.label}</tspan>
              </text>
              <title>{d.label}</title>
            </g>
          </g>
        );
      })}

      <defs>
        <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LineChart({ points, height = 160 }: { points: { x: string; y: number }[]; height?: number }) {
  const w = Math.max(300, points.length * 56);
  const max = Math.max(1, ...points.map(p => p.y));
  const base = height - 24;
  const step = w / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step + 8;
    const y = base - (p.y / max) * (base - 12);
    return { x, y };
  });
  const path = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Line chart">
      <path d={path} fill="none" stroke="#34d399" strokeWidth={2.5} />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3} fill="#34d399" />
          <text x={c.x} y={base + 12} textAnchor="middle" fontSize="11" fill="#94a3b8">{points[i].x}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- CSV helpers (client-side) ---------- */
function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function rowsToCsv(headers: string[], rows: any[][]) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map(r => r.map(csvEscape).join(",")),
  ];
  return lines.join("\n");
}
function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Page ---------- */
const Reports: React.FC = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState<"current" | "movements" | "valuation">("current");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [current, setCurrent] = useState<CurrentStockRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [matId, setMatId] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  async function loadBase() {
    try {
      setLoading(true);
      const [mats, cur, mov, val] = await Promise.all([
        api.get<Material[]>("/materials"),
        api.get<CurrentStockRow[]>("/stock/current"),
        api.get<Movement[]>("/stock/movements"),
        api.get<ValuationRow[]>("/stock/valuation"),
      ]);
      setMaterials(mats.data);
      setCurrent(cur.data);
      setMovements(mov.data);
      setValuation(val.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "We couldn’t load your reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadBase(); }, []);

  /* ---- computed helpers ---- */
  const currentBars = useMemo(() => {
    return current
      .slice()
      .sort((a,b)=>b.totalRemaining - a.totalRemaining)
      .slice(0, 10)
      .map(r => ({
        label: makeShortLabel(r.name, r.unit, 16),
        value: r.totalRemaining
      }));
  }, [current]);

  type ChartDatum = { label: string; value: number };

  const valuationBars = useMemo<ChartDatum[]>(() => {
    return valuation
      .slice()
      .sort((a, b) => b.valuation - a.valuation)
      .slice(0, 10)
      .map(v => ({
        label: makeShortLabel(v.name, v.unit, 16),
        value: Math.round(v.valuation)
      }));
  }, [valuation]);

  const movementSeries = useMemo(() => {
    const filtered = movements
      .filter(m => (matId ? m.materialId === Number(matId) : true))
      .filter(m => (start ? (new Date(m.date) >= new Date(start)) : true))
      .filter(m => (end ? (new Date(m.date) <= new Date(end + "T23:59:59.999Z")) : true));
    return filtered.slice(-20).map((m, i) => ({ x: (i+1).toString(), y: Math.round(Math.abs(m.amount)) }));
  }, [movements, matId, start, end]);

  /* ---- exporters ---- */
  function exportCurrent() {
    const headers = ["Material","Unit","Category","Received","Issued","Remaining","Min","Status"];
    const rows = current.map(r => [
      r.name, r.unit, r.category ?? "", r.totalReceived, r.totalIssued, r.totalRemaining,
      r.minStockLevel, r.belowMin ? "Below Min" : "OK"
    ]);
    downloadText(`stock-current.csv`, rowsToCsv(headers, rows));
  }

  function exportMovements() {
    const filtered = movements
      .filter(m => (matId ? m.materialId === Number(matId) : true))
      .filter(m => (start ? (new Date(m.date) >= new Date(start)) : true))
      .filter(m => (end ? (new Date(m.date) <= new Date(end + "T23:59:59.999Z")) : true))
      .sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime());

    const headers = ["Type","Date","Material","Qty","Rate","Amount","Reference","Supplier"];
    const rows = filtered.map(m => [
      m.type,
      new Date(m.date).toISOString().slice(0,10),
      m.material,
      m.quantity,
      m.rate,
      m.amount,
      m.reference,
      m.supplier ?? ""
    ]);
    downloadText(`stock-movements.csv`, rowsToCsv(headers, rows));
  }

  function exportValuation() {
    const headers = ["Material","Unit","Category","Remaining","Weighted Rate","Valuation"];
    const rows = valuation.map(v => [
      v.name, v.unit, v.category ?? "", v.remainingQuantity,
      Number(v.weightedRate.toFixed(2)), v.valuation
    ]);
    downloadText(`stock-valuation.csv`, rowsToCsv(headers, rows));
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h2 style={{ margin:0, fontWeight:800 }}>Reports</h2>
          <div style={{ opacity:.7, marginTop:6 }}>Understand your inventory at a glance—then dive deeper with charts, filters, and CSV downloads.</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={()=>navigate("/")}
            style={hoverify(btnGhost)}
            onMouseEnter={(e)=>((e.currentTarget.style.borderColor="#3b4369"))}
            onMouseLeave={(e)=>((e.currentTarget.style.borderColor="#2a2f45"))}
            aria-label="Back to Dashboard"
          >
            ⬅ Back to Dashboard
          </button>
        </div>
      </div>

      <div style={tabsRow} role="tablist" aria-label="Report tabs">
        <button style={tabBtn(tab==="current")} onClick={()=>setTab("current")} role="tab" aria-selected={tab==="current"}>Current Stock</button>
        <button style={tabBtn(tab==="movements")} onClick={()=>setTab("movements")} role="tab" aria-selected={tab==="movements"}>Stock Movements</button>
        <button style={tabBtn(tab==="valuation")} onClick={()=>setTab("valuation")} role="tab" aria-selected={tab==="valuation"}>Stock Valuation</button>
      </div>

      {/* ---------- Current Stock TAB ---------- */}
      {tab==="current" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:16 }}>
          <div style={panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:700 }}>Current Stock — All Materials</div>
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={exportCurrent}
                  style={hoverify(btnGreen)}
                  onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                  onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                >
                  Download CSV
                </button>
              </div>
            </div>
            <div style={{ opacity:.6, fontSize:12, marginBottom:8 }}>Quick view of what’s on hand right now. Items below minimum are flagged for action.</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                <thead>
                  <tr>
                    {["Material","Unit","Received","Issued","In Stock","Min","Status"].map(h=><th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={td}> Gathering your stock details…</td></tr>
                  ) : current.length===0 ? (
                    <tr><td colSpan={7} style={td}>No stock to show yet. Add materials and transactions to see them here.</td></tr>
                  ) : current.map(r=>(
                    <tr key={r.materialId}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.unit}</td>
                      <td style={td}>{r.totalReceived}</td>
                      <td style={td}>{r.totalIssued}</td>
                      <td style={td}>{r.totalRemaining}</td>
                      <td style={td}>{r.minStockLevel}</td>
                      <td style={td}>
                        <span style={{ padding:"3px 8px", borderRadius:999, fontSize:12, background: r.belowMin ? "#3b1e27" : "#1b2a34", color: r.belowMin ? "#fca5a5" : "#93c5fd" }}>
                          {r.belowMin ? "Below minimum" : "Looks good"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={glass}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Top 10 by Remaining Qty</div>
            {loading ? "Loading chart…" : <BarChart data={currentBars} />}
            <div style={{ opacity:.7, fontSize:12, marginTop:8 }}>The tallest bars are where most stock sits today.</div>
          </div>
        </div>
      )}

      {/* ---------- Movements TAB ---------- */}
      {tab==="movements" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:16 }}>
          <div style={panel}>
            <div style={{ display:"flex", gap:12, alignItems:"end", flexWrap:"wrap", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12, opacity:.7, marginBottom:6 }}>Filter by material</div>
                <select value={matId} onChange={e=>setMatId(e.target.value)} style={input as any} aria-label="Filter by material">
                  <option value="">All materials</option>
                  {materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, opacity:.7, marginBottom:6 }}>Start date</div>
                <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={input} aria-label="Start date" />
              </div>
              <div>
                <div style={{ fontSize:12, opacity:.7, marginBottom:6 }}>End date</div>
                <input type="date" value={end} onChange={e=>setEnd(e.target.value)} style={input} aria-label="End date" />
              </div>
              <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                <button
                  onClick={exportMovements}
                  style={hoverify(btnGreen)}
                  onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                  onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                >
                  Download CSV
                </button>
              </div>
            </div>

            <div style={{ opacity:.6, fontSize:12, marginBottom:8 }}>View receipts (GRN) and issues over time. Use filters to focus your view.</div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                <thead>
                  <tr>
                    {["Type","Date","Material","Qty","Rate","Amount","Ref","Supplier"].map(h=><th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={td}>Loading movement history…</td></tr>
                  ) : movements
                    .filter(m => (matId ? m.materialId === Number(matId) : true))
                    .filter(m => (start ? (new Date(m.date) >= new Date(start)) : true))
                    .filter(m => (end ? (new Date(m.date) <= new Date(end + "T23:59:59.999Z")) : true))
                    .sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-150)
                    .reverse()
                    .map((m, i)=>(
                      <tr key={i}>
                        <td style={td}>
                          <span style={{ padding:"3px 8px", borderRadius:999, fontSize:12, background: m.type==="GRN"?"#0d2b2b":"#2a230b", color: m.type==="GRN"?"#67e8f9":"#fde68a" }}>
                            {m.type}
                          </span>
                        </td>
                        <td style={td}>{new Date(m.date).toLocaleDateString()}</td>
                        <td style={td}>{m.material}</td>
                        <td style={td}>{m.quantity}</td>
                        <td style={td}>{m.rate}</td>
                        <td style={td}>{fmtINR(Math.abs(m.amount))}</td>
                        <td style={td}>{m.reference}</td>
                        <td style={td}>{m.supplier || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {err && <div style={{ color:"#fca5a5", marginTop:10 }}>⚠ {err}</div>}
          </div>

          <div style={glass}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Recent Cash Flow (abs amount)</div>
            {loading ? "Loading chart…" : <LineChart points={movementSeries} />}
            <div style={{ opacity:.7, fontSize:12, marginTop:8 }}>Trend reflects the last 20 filtered entries.</div>
          </div>
        </div>
      )}

      {/* ---------- Valuation TAB ---------- */}
      {tab==="valuation" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:16 }}>
          <div style={panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:700 }}>Stock Valuation — Weighted Average</div>
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={exportValuation}
                  style={hoverify(btnGreen)}
                  onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                  onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                >
                  Download CSV
                </button>
              </div>
            </div>
            <div style={{ opacity:.6, fontSize:12, marginBottom:8 }}>See what your inventory is worth right now, based on weighted average rate.</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                <thead>
                  <tr>
                    {["Material","Unit","In Stock","Weighted Rate","Valuation"].map(h=><th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={td}>⏳ Calculating valuation…</td></tr>
                  ) : valuation.length===0 ? (
                    <tr><td colSpan={5} style={td}>No valuation to display yet.</td></tr>
                  ) : valuation
                    .slice()
                    .sort((a,b)=> b.valuation - a.valuation)
                    .map(v=>(
                      <tr key={v.materialId}>
                        <td style={td}>{v.name}</td>
                        <td style={td}>{v.unit}</td>
                        <td style={td}>{v.remainingQuantity}</td>
                        <td style={td}>{`₹${v.weightedRate.toFixed(2)}`}</td>
                        <td style={td}>{fmtINR(v.valuation)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={glass}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Top 10 by Valuation</div>
            {loading ? "Loading chart…" : <BarChart data={valuationBars} />}
            <div style={{ opacity:.7, fontSize:12, marginTop:8 }}>Focus replenishment and audits where most value sits.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
