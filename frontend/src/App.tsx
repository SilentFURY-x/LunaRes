import { Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import JobDashboardPage from "./pages/JobDashboardPage";
import ResultViewerPage from "./pages/ResultViewerPage";
import PipelinePage from "./pages/PipelinePage";

// Screen routing follows docs/AppFlow.md section 5 (Screen Inventory Summary).
// Each page is a stub — build them out per that doc's flow descriptions.
export default function App() {
  return (
    <div className="min-h-screen bg-void text-regolith">
      <nav className="border-b border-crater px-6 py-4 flex gap-6 font-display text-sm tracking-wide">
        <Link to="/" className="hover:text-signal">LunaRes</Link>
        <Link to="/enhance" className="hover:text-signal">Enhance</Link>
        <Link to="/jobs" className="hover:text-signal">Jobs</Link>
        <Link to="/pipeline" className="hover:text-signal">ISRO Pipeline</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/enhance" element={<UploadPage />} />
          <Route path="/jobs" element={<JobDashboardPage />} />
          <Route path="/jobs/:jobId/result/:sceneId" element={<ResultViewerPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </main>
    </div>
  );
}
