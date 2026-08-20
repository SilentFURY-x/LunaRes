/**
 * Toggle between Live API and Mock API adapter modes.
 *
 * NOTE: This is a display-only toggle — the actual adapter mode is controlled
 * server-side via BHOONIDHI_ADAPTER_MODE env var. This toggle just shows
 * which mode the backend is currently using.
 *
 * @see docs/frontend_layout.md section 6 — "Toggle between Live API and Mock API"
 * @see backend/api/config.py bhoonidhi_adapter_mode
 */

interface AdapterModeToggleProps {
  currentMode: "live" | "mock" | null;
}

export default function AdapterModeToggle({ currentMode }: AdapterModeToggleProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs text-regolith/50">Adapter Mode:</span>
      <span
        className={`text-sm font-mono px-2 py-0.5 ${
          currentMode === "live"
            ? "bg-green-900/30 text-green-400"
            : currentMode === "mock"
              ? "bg-flare/20 text-flare"
              : "bg-crater text-regolith/40"
        }`}
      >
        {currentMode ?? "Unknown"}
      </span>
      {currentMode === "mock" && (
        <span className="text-xs text-regolith/40">
          (5 pre-loaded catalog entries for demo)
        </span>
      )}
    </div>
  );
}
