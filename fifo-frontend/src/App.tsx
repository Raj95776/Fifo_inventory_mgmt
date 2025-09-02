import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Materials from "./pages/Materials";
import GRNs from "./pages/GRNs";
import IssueNotes from "./pages/IssueNotesList";     
import NewIssueNote from "./pages/NewIssueNote"; 
import Reports from "./pages/Reports";
import SkuInsights from "./components/SkuInsights";

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/grns" element={<GRNs />} />
          <Route path="/issue-notes" element={<IssueNotes />} />
          <Route path="/new-issue" element={<NewIssueNote />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/insights" element={<SkuInsights />}/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
