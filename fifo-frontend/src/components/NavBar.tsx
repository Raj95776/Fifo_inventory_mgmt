import React from "react";

const NavBar: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        padding: 12,
        borderRadius: 16,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800 }}>🏗️ FIFO</div>
    </div>
  );
};

export default NavBar;
