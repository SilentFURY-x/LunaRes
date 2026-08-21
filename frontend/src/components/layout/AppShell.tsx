/**
 * Application shell — wraps all pages with NavBar + Toast notification layer.
 *
 * @see docs/frontend_layout.md section 1 (Global App Shell)
 */

import { useState, useEffect } from "react";
import NavBar from "./NavBar";
import Toast from "@/components/shared/Toast";
import { Particles } from "@/components/ui/particles";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen font-body flex flex-col relative">
      <Particles
        className="fixed inset-0 z-0 pointer-events-none"
        quantity={400}
        ease={80}
        color={isDark ? "#ffffff" : "#000000"}
        refresh
      />
      <div className="relative z-10 flex flex-col flex-1">
        <NavBar />
        <main className="flex-1 flex flex-col relative">{children}</main>
      </div>
      <Toast />
    </div>
  );
}
