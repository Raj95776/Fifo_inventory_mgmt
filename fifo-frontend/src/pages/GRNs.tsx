import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmDialog from "../components/ConfirmDialog";

type Material = { id: number; name: string; unit: string };
type GRN = {
  id: number;
  grnNumber: string;
  materialId: number;
  material?: Material;
  quantity: number;
  remaining: number;
  rate: number;
  amount: number;
  supplierName: string;
  receivedDate: string;
  isActive: boolean;
};

const page: React.CSSProperties = { minHeight: "100vh", background: "#0b1020", padding: 24, color: "#e5e7eb" };
const card: React.CSSProperties = { background: "linear-gradient(180deg,#121734,#0d1228)", border: "1px solid #1a2040", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: 18 };
const input: React.CSSProperties = { padding: 10, borderRadius: 10, border: "1px solid #2a2f45", width: "100%", background: "#0b1020", color: "#e5e7eb" };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734", letterSpacing: .3 };
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.5 };
const btn: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", marginRight: 8, fontWeight: 600, transition: "transform .08s ease" };
const ghostBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #2a2f45", background: "transparent", color: "#cbd5e1", cursor: "pointer", transition: "all .2s ease" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 6px 18px rgba(99,102,241,.25)", transition: "transform .08s ease" };

const empty = {
  grnNumber: "", materialId: "", quantity: "", rate: "", supplierName: "", receivedDate: "",
} as any;

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString()}`;

const GRNs: React.FC = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [list, setList] = useState<GRN[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [mats, grns] = await Promise.all([api.get("/materials"), api.get("/grns")]);
      setMaterials(mats.data);
      setList(grns.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to load GRNs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f: any) => ({ ...f, [name]: value }));
  }

  async function onCreateOrUpdate() {
    setErr("");
    try {
      const payload = {
        grnNumber: form.grnNumber,
        materialId: Number(form.materialId),
        quantity: Number(form.quantity),
        rate: Number(form.rate),
        supplierName: form.supplierName,
        receivedDate: form.receivedDate,
      };
      if (editingId) {
        await api.put(`/grns/${editingId}`, payload);
      } else {
        await api.post("/grns", payload);
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Save failed");
    }
  }

  function onAskDelete(id: number) {
    setDeleteId(id);
    setConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/grns/${deleteId}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Delete failed");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  }

  async function onRestore(id: number) {
    try {
      await api.put(`/grns/${id}/restore`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Restore failed");
    }
  }

  function onEdit(g: GRN) {
    setEditingId(g.id);
    setForm({
      grnNumber: g.grnNumber,
      materialId: String(g.materialId),
      quantity: String(g.quantity),
      rate: String(g.rate),
      supplierName: g.supplierName,
      receivedDate: g.receivedDate.slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={page}>
      <button
        onClick={() => navigate("/")}
        style={{ ...ghostBtn, marginBottom: 16 }}
        onMouseEnter={(e)=>((e.currentTarget.style.borderColor="#3b4369"))}
        onMouseLeave={(e)=>((e.currentTarget.style.borderColor="#2a2f45"))}
        aria-label="Back to Dashboard"
      >
        ⬅ Back to Dashboard
      </button>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:12, flexWrap:"wrap" }}>
          <div>
            <h2 style={{ marginTop: 0 }}> GRNs</h2>
            <div style={{ opacity:.7, fontSize:13, marginTop:6 }}>
              Add or edit receipts from suppliers. Soft delete hides a GRN but keeps history (you can restore it later).
            </div>
          </div>
        </div>

        {err && <div style={{ color: "#fca5a5", margin: "10px 0" }}>⚠ {err}</div>}

        {/* Form */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Field label="GRN Number">
            <input name="grnNumber" value={form.grnNumber} onChange={onChange} style={input} placeholder="e.g., GRN-003" />
          </Field>
          <Field label="Material">
            <select name="materialId" value={form.materialId} onChange={onChange} style={input as any} aria-label="Select material">
              <option value="">Select material</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input name="quantity" type="number" min={1} value={form.quantity} onChange={onChange} style={input} placeholder="0" />
          </Field>
          <Field label="Rate">
            <input name="rate" type="number" min={1} value={form.rate} onChange={onChange} style={input} placeholder="0.00" />
          </Field>
          <Field label="Supplier">
            <input name="supplierName" value={form.supplierName} onChange={onChange} style={input} placeholder="Supplier name" />
          </Field>
          <Field label="Received Date">
            <input name="receivedDate" type="date" value={form.receivedDate} onChange={onChange} style={input} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap:"wrap" }}>
          <button
            onClick={onCreateOrUpdate}
            style={primaryBtn}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          >
            {editingId ? "Update" : "Create"}
          </button>
          {editingId && (
            <button
              onClick={() => { setEditingId(null); setForm(empty); }}
              style={ghostBtn}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={card}>
        {loading ? (
          <div style={{ opacity:.8 }}>⏳ Loading GRNs…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead style={{ background: "#121734" }}>
                <tr>
                  {["GRN #", "Material", "Quantity", "Remaining", "Rate", "Amount", "Supplier", "Received", "Active", "Actions"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id} style={{ background: "transparent" }}>
                    <td style={td}>{g.grnNumber}</td>
                    <td style={td}>{g.material?.name || g.materialId}</td>
                    <td style={td}>{g.quantity}</td>
                    <td style={td}>{g.remaining}</td>
                    <td style={td}>{g.rate}</td>
                    <td style={td}>{fmtINR(g.amount)}</td>
                    <td style={td}>{g.supplierName}</td>
                    <td style={td}>{new Date(g.receivedDate).toLocaleDateString()}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding:"2px 8px",
                          borderRadius:999,
                          fontSize:12,
                          background: g.isActive ? "#0f2b1e" : "#3b1e27",
                          color: g.isActive ? "#86efac" : "#fca5a5"
                        }}
                        aria-label={g.isActive ? "Active" : "Inactive"}
                      >
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => onEdit(g)}
                        style={btn}
                        onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                        onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                      >
                        Edit
                      </button>
                      {g.isActive ? (
                        <button
                          onClick={() => onAskDelete(g.id)}
                          style={{ ...btn, background: "#ef4444" }}
                          onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                          onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => onRestore(g.id)}
                          style={{ ...btn, background: "#16a34a" }}
                          onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                          onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ ...td, opacity: .7 }}>
                      No GRNs found. Add a new receipt using the form above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Soft delete this GRN?"
        message="This will mark the GRN as inactive. You can restore it later."
        confirmText="Soft Delete"
        onCancel={() => { setConfirmOpen(false); setDeleteId(null); }}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
};

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export default GRNs;
