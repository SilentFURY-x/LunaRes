/**
 * Non-blocking toast notification.
 *
 * Used for async events like "Job completed" or "Upload succeeded"
 * so the user can queue multiple tasks without modals blocking them.
 *
 * Teammates: import and call `showToast()` from anywhere — the Toast
 * component must be mounted once in AppShell.
 */

import { useState, useEffect, useCallback } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "info" | "success" | "error";
}

let globalAddToast: ((text: string, type: ToastMessage["type"]) => void) | null = null;

/** Call from anywhere to show a toast. Requires <Toast /> to be mounted. */
export function showToast(text: string, type: ToastMessage["type"] = "info") {
  globalAddToast?.(text, type);
}

let nextId = 0;

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage["type"]) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const typeStyles: Record<ToastMessage["type"], string> = {
    info: "border-divider",
    success: "border-green-500",
    error: "border-flare",
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-background border ${typeStyles[t.type]} px-4 py-2 text-sm text-secondaryText`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
