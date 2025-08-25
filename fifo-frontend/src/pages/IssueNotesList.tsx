import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

type IssueItem = { id: number; quantity: number; rate: number; amount: number; grnId: number };
type Material = { id: number; name: string; unit: string };
type IssueNote = {
  id: number;
  issueNumber: string;
  issueDate: string;
  materialId: number;
  material?: Material;
  totalQuantity: number;
  totalAmount: number;
  weightedRate: number;
  items?: IssueItem[];
};

const page: React.CSSProperties = { minHeight: "100vh", background: "#0b1020", padding: 24, color: "#e5e7eb" };
const card: React.CSSProperties = { background: "linear-gradient(180deg,#121734,#0d1228)", border: "1px solid #1a2040", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: 18 };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734", letterSpacing: .3 };
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.5 };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 6px 18px rgba(99,102,241,.25)", transition: "transform .08s ease" };
const ghostBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #2a2f45", background: "transparent", color: "#cbd5e1", cursor: "pointer", transition: "all .2s ease" };

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString()}`;

const IssueNotes: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<IssueNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get<IssueNote[]>("/issue-notes");
      setList(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to load Issue Notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/")}
          style={ghostBtn}
          onMouseEnter={(e)=>((e.currentTarget.style.borderColor="#3b4369"))}
          onMouseLeave={(e)=>((e.currentTarget.style.borderColor="#2a2f45"))}
          aria-label="Back to Dashboard"
        >
          ⬅ Back to Dashboard
        </button>
        <button
          onClick={() => navigate("/new-issue")}
          style={primaryBtn}
          onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
          onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          aria-label="Create new Issue Note"
        >
          + New Issue
        </button>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}> Issue Notes</h2>
        <div style={{ opacity:.7, fontSize:13, marginBottom:10 }}>
          View all material issues with their weighted rates and total amounts.
        </div>
        {err && <div style={{ color: "#fca5a5", marginBottom: 10 }}>⚠ {err}</div>}

        {loading ? (
          <div style={{ opacity:.8 }}>⏳ Loading issue notes…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Issue #", "Date", "Material", "Quantity", "Weighted Rate", "Amount"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(n => (
                  <tr key={n.id}>
                    <td style={td}>{n.issueNumber}</td>
                    <td style={td}>{new Date(n.issueDate).toLocaleDateString()}</td>
                    <td style={td}>{n.material?.name || n.materialId}</td>
                    <td style={td}>{n.totalQuantity}</td>
                    <td style={td}>{`₹${n.weightedRate.toFixed(2)}`}</td>
                    <td style={td}>{fmtINR(n.totalAmount)}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...td, opacity: .7 }}>
                      No issue notes yet. Click <b>+ New Issue</b> to create your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueNotes;
