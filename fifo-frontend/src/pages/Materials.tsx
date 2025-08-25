import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmDialog from "../components/ConfirmDialog";

type Material = {
  id: number;
  name: string;
  description?: string | null;
  unit: string;
  category?: string | null;
  minStockLevel: number;
  isActive: boolean;
};

/* ---------- Styles (match dashboard/GRNs) ---------- */
const page: React.CSSProperties = { minHeight: "100vh", background: "#0b1020", padding: 24, color: "#e5e7eb" };
const card: React.CSSProperties = { background: "linear-gradient(180deg,#121734,#0d1228)", border: "1px solid #1a2040", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.35)", padding: 18 };
const input: React.CSSProperties = { padding: 10, borderRadius: 10, border: "1px solid #2a2f45", width: "100%", background: "#0b1020", color: "#e5e7eb" };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #1f2545", fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "#121734", letterSpacing: .3 };
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #1f2545", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.5 };
const btn: React.CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", marginRight: 8, fontWeight: 600, transition: "transform .08s ease" };
const ghostBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #2a2f45", background: "transparent", color: "#cbd5e1", cursor: "pointer", transition: "all .2s ease" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 6px 18px rgba(99,102,241,.25)", transition: "transform .08s ease" };

const emptyForm = { name: "", description: "", unit: "", category: "", minStockLevel: 0 };

const Materials: React.FC = () => {
  const navigate = useNavigate();

  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form state
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  // ui filters
  const [search, setSearch] = useState("");

  // confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      // backend returns active materials only
      const { data } = await api.get<Material[]>("/materials");
      setList(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "We couldn’t load materials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "minStockLevel" ? Number(value) : value }));
  }

  async function onCreateOrUpdate() {
    setErr("");
    try {
      if (!form.name || !form.unit) {
        setErr("Name and Unit are required.");
        return;
      }
      if (editingId) {
        await api.put(`/materials/${editingId}`, form);
      } else {
        await api.post("/materials", form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Save failed");
    }
  }

  function onEdit(m: Material) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      description: m.description || "",
      unit: m.unit,
      category: m.category || "",
      minStockLevel: m.minStockLevel,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAskDelete(id: number) {
    setDeleteId(id);
    setConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/materials/${deleteId}`);
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
      await api.put(`/materials/${id}/restore`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Restore failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = list; // (active-only from backend)
    return term ? base.filter(m => m.name.toLowerCase().includes(term)) : base;
  }, [list, search]);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0 }}> Materials</h2>
            <div style={{ opacity: .7, marginTop: 6, fontSize: 13 }}>
              Add, edit, or soft delete materials. Soft delete keeps history intact and can be undone later.
            </div>
          </div>
          <div style={{ minWidth: 240 }}>
            <div style={{ fontSize: 12, opacity: .7, marginBottom: 6 }}>Search</div>
            <input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={input}
              aria-label="Search materials by name"
            />
          </div>
        </div>

        {err && <div style={{ color: "#fca5a5", marginTop: 10 }}>⚠ {err}</div>}

        {/* Form */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <Field label="Name*"><input name="name" value={form.name} onChange={onChange} style={input} placeholder="e.g., Steel Rod 8mm" /></Field>
          <Field label="Unit*"><input name="unit" value={form.unit} onChange={onChange} style={input} placeholder="e.g., kg, pcs, m" /></Field>
          <Field label="Category"><input name="category" value={form.category} onChange={onChange} style={input} placeholder="Optional category" /></Field>
          <Field label="Min Stock"><input name="minStockLevel" type="number" value={String(form.minStockLevel)} onChange={onChange} style={input} placeholder="0" /></Field>
          <Field label="Description"><input name="description" value={form.description} onChange={onChange} style={input} placeholder="Short description (optional)" /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
              onClick={() => { setEditingId(null); setForm(emptyForm); }}
              style={ghostBtn}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {["Name", "Unit", "Category", "Min Stock", "Active", "Actions"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={td}> Loading materials…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, opacity: .7 }}>No materials found. Try a different search or add a new material above.</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id}>
                    <td style={td}>{m.name}</td>
                    <td style={td}>{m.unit}</td>
                    <td style={td}>{m.category || "—"}</td>
                    <td style={td}>{m.minStockLevel}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          background: m.isActive ? "#0f2b1e" : "#3b1e27",
                          color: m.isActive ? "#86efac" : "#fca5a5"
                        }}
                        aria-label={m.isActive ? "Active" : "Inactive"}
                      >
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => onEdit(m)}
                        style={btn}
                        onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                        onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                      >
                        Edit
                      </button>
                      {m.isActive ? (
                        <button
                          onClick={() => onAskDelete(m.id)}
                          style={{ ...btn, background: "#ef4444" }}
                          onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                          onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => onRestore(m.id)}
                          style={{ ...btn, background: "#16a34a" }}
                          onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
                          onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDialog
        open={confirmOpen}
        title="Soft delete this material?"
        message="This will mark the material as inactive. You can restore it later."
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

export default Materials;
