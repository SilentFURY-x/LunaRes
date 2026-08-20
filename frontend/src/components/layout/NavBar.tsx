/**
 * Top navigation bar with route links and live backend health indicator.
 *
 * Health dot:
 *   🟢 green = all services up (GET /health returns "ok")
 *   🟡 yellow = degraded
 *   🔴 red = down or unreachable
 *
 * @see src/hooks/useHealth.ts
 * @see docs/frontend_layout.md section 1 (Global App Shell)
 */

import { Link, useLocation } from "react-router-dom";
import { useHealth } from "@/hooks/useHealth";

const NAV_LINKS = [
  { to: "/", label: "LunaRes" },
  { to: "/workspace", label: "Workspace" },
  { to: "/jobs", label: "Dashboard" },
  { to: "/pipeline", label: "ISRO Pipeline" },
] as const;

export default function NavBar() {
  const location = useLocation();
  const { isHealthy, isError, isLoading } = useHealth();

  function healthColor() {
    if (isLoading) return "bg-regolith/30";
    if (isError) return "bg-red-500";
    if (isHealthy) return "bg-green-500";
    return "bg-yellow-500";
  }

  function healthLabel() {
    if (isLoading) return "Checking…";
    if (isError) return "Backend unreachable";
    if (isHealthy) return "All systems operational";
    return "Degraded";
  }

  return (
    <nav className="border-b border-crater px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.to);

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-display tracking-wide ${
                isActive ? "text-signal" : "text-regolith/70"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Health indicator */}
      <div className="flex items-center gap-2 text-xs text-regolith/60">
        <span
          className={`w-2 h-2 rounded-full ${healthColor()}`}
          title={healthLabel()}
        />
        <span>{healthLabel()}</span>
      </div>
    </nav>
  );
}
