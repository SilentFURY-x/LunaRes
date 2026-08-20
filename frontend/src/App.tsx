/**
 * Root application component — routing + AppShell.
 *
 * Route structure follows docs/AppFlow.md section 5 (Screen Inventory).
 * All pages are wrapped in AppShell which provides NavBar + Toast.
 *
 * @see docs/AppFlow.md
 * @see src/components/layout/AppShell.tsx
 */

import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import WorkspacePage from "./pages/WorkspacePage";
import JobDashboardPage from "./pages/JobDashboardPage";
import ResultViewerPage from "./pages/ResultViewerPage";
import PipelinePage from "./pages/PipelinePage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/jobs" element={<JobDashboardPage />} />
        <Route path="/jobs/:jobId/result/:sceneId" element={<ResultViewerPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
      </Routes>
    </AppShell>
  );
}
