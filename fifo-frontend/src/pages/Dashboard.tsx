import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
// ⛔ removed SkuWidget import
import ReorderBoard from "../components/ReorderBoard"; // ✅ uses ML for ALL materials

/* ---------- Types ---------- */
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

/* ---------- Styles ---------- */
const page: React.CSSProperties = { minHeight: "100vh", background: "#0b1020", padding: 24, color: "#e5e7eb" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" };
const actionsRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 6px 18px rgba(99,102,241,.25)", transition: "transform .08s ease" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #2a2f45", background: "transparent", color: "#cbd5e1", cursor: "pointer", transition: "all .2s ease" };
const kpiGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const card: React.CSSProperties = { background: "linear-gradient(180deg,#121734,#0d1228)", border: "1px solid #1a2040", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: 18 };
const glass: React.CSSProperties = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 18 };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734", letterSpacing: .3 };
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.5 };

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
function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = 26, gap = 18, leftPad = 10, rightPad = 10, base = height - 26;
  const w = Math.max(300, leftPad + rightPad + data.length * (bw + gap));
  const steps = 4;
  const gridYs = Array.from({length: steps+1}, (_,i)=> base - (i/steps)*(base-14));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bar chart">
      <rect x={0} y={0} width={w} height={height} fill="transparent" />
      {gridYs.map((gy, i)=>(<line key={i} x1={leftPad} y1={gy} x2={w-rightPad} y2={gy} stroke="#263056" strokeWidth={1} opacity={0.35} />))}
      {data.map((d, i) => {
        const h = (d.value / max) * (base - 12);
        const x = leftPad + i * (bw + gap);
        const y = base - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx={7} fill="url(#gradBar)" />
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#e5e7eb">{compact(Math.round(d.value))}</text>
            <g transform={`translate(${x + bw / 2}, ${base + 10}) rotate(-28)`}>
              <text textAnchor="end" fontSize="10" fill="#94a3b8"><tspan>{d.label}</tspan></text>
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

function DonutChart({ parts, size = 160 }: { parts: { label: string; value: number }[]; size?: number }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, strokeW = 18;
  let acc = 0;
  const palette = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#a78bfa", "#f97316"];
  return (
    <svg width={size} height={size} role="img" aria-label="Donut chart">
      <circle cx={cx} cy={cy} r={r} stroke="#1f2545" strokeWidth={strokeW} fill="none" />
      {parts.map((p, i) => {
        const angle = (p.value / total) * Math.PI * 2;
        const large = angle > Math.PI ? 1 : 0;
        const start = acc, end = acc + angle; acc += angle;
        const x1 = cx + r * Math.cos(start - Math.PI / 2);
        const y1 = cy + r * Math.sin(start - Math.PI / 2);
        const x2 = cx + r * Math.cos(end - Math.PI / 2);
        const y2 = cy + r * Math.sin(end - Math.PI / 2);
        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
        return <path key={i} d={path} stroke={palette[i % palette.length]} strokeWidth={strokeW} fill="none" />;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#e5e7eb">
        {total}
      </text>
    </svg>
  );
}

function LineChartMini({ points, height = 140 }: { points: { x: string; y: number }[]; height?: number }) {
  const w = Math.max(260, points.length * 56);
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

/* ---------- Page ---------- */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<CurrentStockRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [cur, mov, val] = await Promise.all([
        api.get<CurrentStockRow[]>("/stock/current"),
        api.get<Movement[]>("/stock/movements"),
        api.get<ValuationRow[]>("/stock/valuation"),
      ]);
      setCurrent(cur.data);
      setMovements(mov.data.slice(-12));
      setValuation(val.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const totalItems = current.length;
    const totalQty = current.reduce((s, r) => s + r.totalRemaining, 0);
    const belowMin = current.filter(r => r.belowMin).length;
    const invValue = valuation.reduce((s, r) => s + r.valuation, 0);
    return { totalItems, totalQty, belowMin, invValue };
  }, [current, valuation]);

  const categoryParts = useMemo(() => {
    const map: Record<string, number> = {};
    current.forEach(r => { const k = r.category || "Uncategorized"; map[k] = (map[k] || 0) + r.totalRemaining; });
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a,b)=>b.value-a.value).slice(0,7);
  }, [current]);

  const valBars = useMemo(() => {
    return valuation.slice().sort((a,b) => b.valuation - a.valuation).slice(0, 7).map(v => {
      const short = makeShortLabel(v.name, v.unit, 16);
      return { label: short, value: Math.round(v.valuation) };
    });
  }, [valuation]);

  const flowSeries = useMemo(() => movements.map((m, idx) => ({ x: (idx+1).toString(), y: Math.round(Math.abs(m.amount)) })), [movements]);

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Dashboard</h2>
          <div style={{ opacity: .7, marginTop: 6 }}>Quick glance at inventory health. Use the links to jump into details.</div>
        </div>
        <div style={actionsRow}>
          <button style={btnPrimary}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
            onClick={()=>navigate("/materials")} aria-label="Go to Materials">Materials</button>
          <button style={btnPrimary}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
            onClick={()=>navigate("/grns")} aria-label="Go to GRNs">GRNs</button>
          <button style={btnPrimary}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
            onClick={()=>navigate("/issue-notes")} aria-label="Go to Issue Notes">New Issue</button>
          <button style={btnGhost}
            onMouseEnter={(e)=>((e.currentTarget.style.borderColor="#3b4369"))}
            onMouseLeave={(e)=>((e.currentTarget.style.borderColor="#2a2f45"))}
            onClick={()=>navigate("/reports")} aria-label="Go to Reports">Reports</button>
          {/* ⛔ removed ML Insights button (separate page will handle preview) */}
        </div>
      </div>

      {/* KPIs */}
      <div style={kpiGrid}>
        <div style={card}><div style={{ opacity:.7, fontSize:12 }}>Tracked Materials</div><div style={{ fontSize:32, fontWeight:800, marginTop:6 }}>{stats.totalItems}</div></div>
        <div style={card}><div style={{ opacity:.7, fontSize:12 }}>On-Hand Quantity</div><div style={{ fontSize:32, fontWeight:800, marginTop:6 }}>{stats.totalQty.toLocaleString()}</div></div>
        <div style={card}><div style={{ opacity:.7, fontSize:12 }}>Below Min Level</div><div style={{ fontSize:32, fontWeight:800, marginTop:6, color: stats.belowMin? "#fca5a5" : "#86efac" }}>{stats.belowMin}</div></div>
        <div style={card}><div style={{ opacity:.7, fontSize:12 }}>Stock Valuation</div><div style={{ fontSize:32, fontWeight:800, marginTop:6 }}>{fmtINR(stats.invValue)}</div></div>
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap: 16, marginTop: 16 }}>
        <div style={glass}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Valuation (Top 7)</div>
          {loading ? "Loading…" : <BarChart data={valBars} />}
          {!loading && valBars.length === 0 && <div style={{ opacity:.7, marginTop:8 }}>No valuation data yet.</div>}
        </div>
        <div style={glass}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Remaining by Category</div>
          {loading ? "Loading…" : (
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <DonutChart parts={categoryParts} />
              <div>
                {categoryParts.map((p, i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:13, marginBottom:6 }}>
                    <span style={{ opacity:.85 }}>{p.label}</span><b>{p.value}</b>
                  </div>
                ))}
                {categoryParts.length === 0 && <div style={{ opacity:.7 }}>No category data.</div>}
              </div>
            </div>
          )}
        </div>
        <div style={glass}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Recent Flow (abs Amount)</div>
          {loading ? "Loading…" : <LineChartMini points={flowSeries} />}
          {!loading && flowSeries.length === 0 && <div style={{ opacity:.7, marginTop:8 }}>No recent movements.</div>}
        </div>
      </div>

      {/* ✅ NEW: Auto-ML Reorder suggestions for EVERY material */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))", gap: 16, marginTop: 16 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <ReorderBoard leadTimeDays={5} />
        </div>
      </div>

      {/* Latest tables */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))", gap: 16, marginTop: 16 }}>
        <div style={glass}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>Current Stock (Top 10 by Remaining)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
              <thead><tr>{["Material","Unit","Remaining","Min","Status"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={td}>Loading…</td></tr>
                ) : current.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...td, opacity:.7 }}>No stock yet.</td></tr>
                ) : (
                  current.slice().sort((a,b)=>b.totalRemaining-a.totalRemaining).slice(0,10).map(r=>(
                    <tr key={r.materialId}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.unit}</td>
                      <td style={td}>{r.totalRemaining}</td>
                      <td style={td}>{r.minStockLevel}</td>
                      <td style={td}>
                        <span style={{ padding:"3px 8px", borderRadius:999, fontSize:12, background: r.belowMin ? "#3b1e27" : "#1b2a34", color: r.belowMin ? "#fca5a5" : "#93c5fd" }}>
                          {r.belowMin ? "Below Min" : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div style={glass}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>Recent Movements (10)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
              <thead><tr>{["Type","Date","Material","Qty","Amount","Ref"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={td}>Loading…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, opacity:.7 }}>No movements recorded.</td></tr>
                ) : (
                  movements.slice(-10).reverse().map((m,i)=>(
                    <tr key={i}>
                      <td style={td}>
                        <span style={{ padding:"3px 8px", borderRadius:999, fontSize:12, background: m.type==="GRN"?"#0d2b2b":"#2a230b", color: m.type==="GRN"?"#67e8f9":"#fde68a" }}>{m.type}</span>
                      </td>
                      <td style={td}>{new Date(m.date).toLocaleDateString()}</td>
                      <td style={td}>{m.material}</td>
                      <td style={td}>{m.quantity}</td>
                      <td style={td}>{fmtINR(Math.abs(m.amount))}</td>
                      <td style={td}>{m.reference}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {err && <div style={{ color:"#fca5a5", marginTop:12 }}>⚠ {err}</div>}
    </div>
  );
};

export default Dashboard;
