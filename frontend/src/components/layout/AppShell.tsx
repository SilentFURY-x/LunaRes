/**
 * Application shell — wraps all pages with NavBar + Toast notification layer.
 *
 * @see docs/frontend_layout.md section 1 (Global App Shell)
 */

import NavBar from "./NavBar";
import Toast from "@/components/shared/Toast";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-void text-regolith font-body">
      <NavBar />
      <main>{children}</main>
      <Toast />
    </div>
  );
}
