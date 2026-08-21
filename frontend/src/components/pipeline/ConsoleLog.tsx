/**
 * Step-by-step console log display for pipeline demo runs.
 *
 * @see docs/frontend_layout.md section 6 — "Console View"
 */

export interface LogEntry {
  timestamp: string;
  message: string;
  status: "pending" | "running" | "done" | "error";
}

interface ConsoleLogProps {
  entries: LogEntry[];
}

const STATUS_INDICATORS: Record<LogEntry["status"], string> = {
  pending: "○",
  running: "◉",
  done: "✓",
  error: "✗",
};

const STATUS_COLORS: Record<LogEntry["status"], string> = {
  pending: "text-secondaryText",
  running: "text-primaryText",
  done: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
};

export default function ConsoleLog({ entries }: ConsoleLogProps) {
  if (entries.length === 0) {
    return (
      <div className="border border-divider p-3 text-xs text-secondaryText font-mono">
        Console output will appear here…
      </div>
    );
  }

  return (
    <div className="border border-divider p-3 font-mono text-xs max-h-64 overflow-y-auto">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 mb-0.5">
          <span className={STATUS_COLORS[entry.status]}>
            {STATUS_INDICATORS[entry.status]}
          </span>
          <span className="text-secondaryText">{entry.timestamp}</span>
          <span className="text-secondaryText">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
