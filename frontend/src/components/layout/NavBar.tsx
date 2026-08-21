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
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const NAV_LINKS = [
  { to: "/workspace", label: "Workspace" },
  { to: "/jobs", label: "Dashboard" },
  { to: "/pipeline", label: "ISRO Pipeline" },
] as const;

export default function NavBar() {
  const location = useLocation();
  const { isHealthy, isError, isLoading } = useHealth();

  function healthColor() {
    if (isLoading) return "bg-zinc-400/30";
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
    <nav className="border-b border-divider px-6 py-4 flex items-center justify-between">
      {/* Website Name (Left) */}
      <Link to="/" className="text-xl font-display font-extrabold uppercase tracking-wider text-primaryText font-semibold">
        LunaRes
      </Link>

      {/* Navigation (Right) */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-6 mr-4">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname.startsWith(link.to);

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-display font-extrabold uppercase tracking-wider tracking-wide ${
                  isActive ? "text-primaryText" : "text-secondaryText hover:opacity-80"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Health indicator */}
        <div className="flex items-center gap-2 text-xs text-secondaryText">
          <span
            className={`w-2 h-2 rounded-full ${healthColor()}`}
            title={healthLabel()}
          />
          <span>{healthLabel()}</span>
        </div>

        {/* Theme Toggler */}
        <AnimatedThemeToggler />
      </div>
    </nav>
  );
}
