import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

type Material = { id: number; name: string; unit: string };
type PreviewRow = { grnId: number; grnNumber: string; takeQty: number; rate: number; amount: number; receivedDate: string };
type PreviewResp = { materialId: number; requestedQty: number; breakdown: PreviewRow[]; totalAmount: number; weightedRate: number };

const card: React.CSSProperties = { background:"#fff", borderRadius:16, boxShadow:"0 6px 20px rgba(0,0,0,0.06)", padding:18 };
const input: React.CSSProperties = { padding:10, borderRadius:10, border:"1px solid #e5e7eb", width:"100%" };
const td: React.CSSProperties = { padding:"12px 14px", borderBottom:"1px solid #eef2f7", fontSize:13.5, lineHeight:1.5 };
const th: React.CSSProperties = { textAlign:"left", padding:"12px 14px", borderBottom:"1px solid #e5e7eb", fontSize:12.5, fontWeight:700, color:"#475569", background:"#f8fafc" };
const btn: React.CSSProperties = { padding:"10px 14px", borderRadius:10, border:"none", background:"#4f46e5", color:"#fff", cursor:"pointer", marginRight:8, fontWeight:600, transition:"transform .08s ease" };
const btnGhost: React.CSSProperties = { padding:"10px 14px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" };

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString()}`;

const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [issueNumber, setIssueNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{ (async()=>{
    try { const { data } = await api.get<Material[]>("/materials"); setMaterials(data); }
    catch(e:any){ setErr(e?.response?.data?.error || "Couldn’t load materials, please try again."); }
  })(); }, []);

  async function onPreview() {
    setErr(""); setLoading(true); setPreview(null);
    try {
      const { data } = await api.post<PreviewResp>("/issue-notes/preview", { materialId: Number(materialId), quantity: Number(quantity) });
      setPreview(data);
    } catch (e:any) {
      setErr(e?.response?.data?.error || "Preview request failed.");
    } finally { setLoading(false); }
  }

  async function onCreate() {
    setErr(""); setLoading(true);
    try {
      await api.post("/issue-notes", {
        materialId: Number(materialId),
        quantity: Number(quantity),
        issueNumber,
        issueDate,
      });
      setMaterialId(""); setQuantity(""); setIssueNumber(""); setIssueDate(""); setPreview(null);
      alert(" Issue Note created successfully!");
    } catch (e:any) {
      setErr(e?.response?.data?.error || "Couldn’t create Issue Note.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f7f8fb", padding:24 }}>
      <button onClick={()=>navigate("/")} style={{ marginBottom:16, ...btnGhost }}>⬅ Back to Dashboard</button>

      <div style={{ ...card, marginBottom:16 }}>
        <h2 style={{ marginTop:0 }}>🧾 New Issue</h2>
        <div style={{ opacity:.7, fontSize:13, marginBottom:12 }}>Fill in the details to issue material. You can preview FIFO consumption before finalizing.</div>
        {err && <div style={{ color:"#b91c1c", marginBottom:10 }}>⚠ {err}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
          <Field label="Material">
            <select value={materialId} onChange={e=>setMaterialId(e.target.value)} style={input as any}>
              <option value="">Select a material</option>
              {materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity"><input type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} style={input} /></Field>
          <Field label="Issue Number"><input value={issueNumber} onChange={e=>setIssueNumber(e.target.value)} style={input} /></Field>
          <Field label="Issue Date"><input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={input} /></Field>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button
            onClick={onPreview}
            style={btn}
            disabled={loading || !materialId || !quantity}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          >
             Preview
          </button>
          <button
            onClick={onCreate}
            style={{ ...btn, background:"#16a34a" }}
            disabled={loading || !materialId || !quantity || !issueNumber || !issueDate}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          >
             Create Issue
          </button>
        </div>
      </div>

      {/* PREVIEW */}
      <div style={card}>
        <h3 style={{ marginTop:0 }}>Preview (FIFO Breakdown)</h3>
        {loading ? (
          <div style={{ opacity:.7 }}> Generating preview…</div>
        ) : !preview ? (
          <div style={{ opacity:.7 }}>Run a preview to see which GRNs will be consumed for this issue.</div>
        ) : (
          <>
            <div style={{ marginBottom:10, fontSize:13.5 }}>
              Requested Qty: <b>{preview.requestedQty}</b> • Weighted Rate: <b>{fmtINR(preview.weightedRate)}</b> • Total Amount: <b>{fmtINR(preview.totalAmount)}</b>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0, border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
                <thead>
                  <tr>{["GRN #","Taken Qty","Rate","Amount","Received"].map(h=><th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.breakdown.map((b,i)=>(
                    <tr key={i}>
                      <td style={td}>{b.grnNumber}</td>
                      <td style={td}>{b.takeQty}</td>
                      <td style={td}>{b.rate}</td>
                      <td style={td}>{fmtINR(b.amount)}</td>
                      <td style={td}>{new Date(b.receivedDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div>
      <div style={{ fontSize:12, opacity:.7, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

export default NewIssue;
