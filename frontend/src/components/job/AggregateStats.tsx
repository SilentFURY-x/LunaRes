/**
 * Aggregate stats bar — shows active workers, total tiles processed, throughput.
 * Critical for the live scalability demo.
 *
 * @see docs/frontend_layout.md section 4 — "Aggregate Stats (Top)"
 */

import type { AggregateStatsData } from "@/api/types";

interface AggregateStatsProps {
  stats: AggregateStatsData | undefined;
  isLoading?: boolean;
}

export default function AggregateStats({ stats, isLoading }: AggregateStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="flex gap-6 px-4 py-3 border border-crater mb-4">
        <span className="text-sm text-regolith/50">Loading stats…</span>
      </div>
    );
  }

  return (
    <div className="flex gap-8 px-4 py-3 border border-crater mb-4">
      <div>
        <span className="text-xs text-regolith/50 block">Active Workers</span>
        <span className="text-lg font-mono text-signal">{stats.active_workers}</span>
      </div>
      <div>
        <span className="text-xs text-regolith/50 block">Total Tiles Processed</span>
        <span className="text-lg font-mono text-regolith">{stats.total_tiles_processed.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-xs text-regolith/50 block">Throughput</span>
        <span className="text-lg font-mono text-signal">
          {stats.throughput_tiles_per_minute.toFixed(1)}
        </span>
        <span className="text-xs text-regolith/50 ml-1">tiles/min</span>
      </div>
    </div>
  );
}
