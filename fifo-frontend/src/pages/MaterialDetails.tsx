// src/pages/MaterialDetails.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type HistoryPoint = {
  date: string;        // yyyy-mm-dd
  stockLevel: number;  // cumulative (naive) based on GRNs
  valuation: number;   // cumulative value based on GRNs
};

type MaterialDetailsData = {
  materialId: number;
  name: string;
  unit: string;
  category?: string | null;
  totalRemaining: number;
  valuation: number;
  history: HistoryPoint[];
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  padding: 20,
};

/* Display-only formatter */
const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString()}`;

const MaterialDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<MaterialDetailsData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    setError("");
    api
      .get(`/materials/${id}`)
      .then((res) => setMaterial(transformMaterial(res.data)))
      .catch((e) => {
        console.error("Failed to load material:", e);
        setError(e?.response?.data?.error || "Failed to load material");
      });
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 10,
            border: "none",
            background: "#e5e7eb",
            cursor: "pointer",
          }}
          aria-label="Go back"
        >
          ⬅ Back
        </button>
        <div style={{ color: "#b91c1c" }}>⚠ {error}</div>
      </div>
    );
  }

  if (!material) {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 10,
            border: "none",
            background: "#e5e7eb",
            cursor: "pointer",
          }}
          aria-label="Go back"
        >
          ⬅ Back
        </button>
        <div style={{ opacity: 0.8 }}>⏳ Loading material details…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fb", padding: 24 }}>
      <button
        className="mb-4"
        style={{
          marginBottom: 12,
          padding: "8px 12px",
          borderRadius: 10,
          border: "none",
          background: "#4f46e5",
          color: "#fff",
          cursor: "pointer",
          transition: "transform .08s ease",
        }}
        onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
        onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        ⬅ Back
      </button>

      <div style={{ ...card, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
           {material.name} <span style={{ opacity: 0.6, fontWeight: 500 }}> (ID: {material.materialId})</span>
        </h1>
        <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><strong>Unit:</strong> {material.unit}</div>
          {material.category && <div><strong>Category:</strong> {material.category}</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginTop: 16 }}>
          <Stat label="Total Remaining" value={String(material.totalRemaining)} />
          <Stat label="Valuation" value={fmtINR(material.valuation)} />
        </div>
      </div>

      {/* History Chart */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Stock & Valuation History</h3>
        {material.history.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No historical points available yet.</div>
        ) : (
          <>
            <div style={{ opacity:.7, fontSize:12, marginBottom:8 }}>
              Cumulative values based on GRN receive dates (issues not time-stamped here).
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={material.history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="stockLevel" stroke="#4F46E5" name="Stock Level" />
                  <Line type="monotone" dataKey="valuation" stroke="#F59E0B" name="Valuation" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* History Table */}
      <div style={card}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}> History Table</h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                {["Date", "Stock Level", "Valuation"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {material.history.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 14, fontSize: 14, opacity: 0.7 }}>
                    No historical data yet.
                  </td>
                </tr>
              ) : (
                material.history.map((h, index) => (
                  <tr key={index} style={{ background: "#fff" }}>
                    <td style={td}>{h.date}</td>
                    <td style={td}>{h.stockLevel}</td>
                    <td style={td}>{fmtINR(h.valuation)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#ffffff", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const td: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13.5,
};

// ---- transform raw /materials/:id payload into the shape our UI expects
function transformMaterial(m: any): MaterialDetailsData {
  const grns = Array.isArray(m.grns) ? m.grns : [];

  // Totals (from GRNs only — we don't have issue dates here)
  const totalRemaining: number = grns.reduce((s: number, g: any) => s + (g.remaining ?? 0), 0);
  const valuation: number = grns.reduce((s: number, g: any) => s + (g.remaining ?? 0) * (g.rate ?? 0), 0);

  // Simple history line: cumulative by GRN receivedDate (naive; issues not time-stamped here)
  const sorted = [...grns].sort(
    (a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
  );

  let cumQty = 0;
  let cumVal = 0;
  const history: HistoryPoint[] = sorted.map((g: any) => {
    const q = Number(g.quantity ?? 0);
    const r = Number(g.rate ?? 0);
    cumQty += q;
    cumVal += q * r;
    return {
      date: new Date(g.receivedDate).toISOString().slice(0, 10),
      stockLevel: cumQty,
      valuation: cumVal,
    };
  });

  return {
    materialId: m.id,
    name: m.name,
    unit: m.unit,
    category: m.category,
    totalRemaining,
    valuation,
    history,
  };
}

export default MaterialDetails;
