import React from "react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 16
};

const card: React.CSSProperties = {
  width: 420,
  maxWidth: "92vw",
  background: "linear-gradient(180deg,#0f172a,#0b1224)",
  color: "#e5e7eb",
  borderRadius: 16,
  border: "1px solid #1f2937",
  padding: 16,
  boxShadow: "0 20px 50px rgba(0,0,0,.5)"
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 6
};

const titleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 16,
};

const messageStyle: React.CSSProperties = {
  opacity: .85,
  marginTop: 2,
  marginBottom: 14,
  lineHeight: 1.5,
  fontSize: 13.5
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  marginTop: 6,
  flexWrap: "wrap"
};

const btnBase: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  transition: "transform .08s ease, filter .12s ease"
};

const cancelBtn: React.CSSProperties = {
  ...btnBase,
  background: "#374151",
  color: "#e5e7eb"
};

const confirmBtn: React.CSSProperties = {
  ...btnBase,
  background: "linear-gradient(135deg,#ef4444,#f97316)",
  color: "#fff",
  boxShadow: "0 6px 18px rgba(239,68,68,.25)"
};

const ConfirmDialog: React.FC<Props> = ({
  open,
  title = "Are you sure?",
  message = "This action can’t be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  const titleId = "confirm-title";
  const descId = "confirm-desc";

  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      <div style={card}>
        <div style={headerRow}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>⚠️</span>
          <div id={titleId} style={titleStyle}>{title}</div>
        </div>

        <div id={descId} style={messageStyle}>{message}</div>

        <div style={btnRow}>
          <button
            onClick={onCancel}
            style={cancelBtn}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={confirmBtn}
            onMouseDown={(e)=>((e.currentTarget.style.transform="translateY(1px)"))}
            onMouseUp={(e)=>((e.currentTarget.style.transform="translateY(0)"))}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
