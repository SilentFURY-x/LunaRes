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
      <div className="flex gap-6 px-6 py-4 border border-divider mb-8">
        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">Loading stats…</span>
      </div>
    );
  }

  return (
    <div className="flex gap-12 px-6 py-4 border border-divider mb-8">
      <div>
        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText block mb-1">Active Workers</span>
        <span className="font-display font-extrabold text-lg text-primaryText">{stats.active_workers}</span>
      </div>
      <div>
        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText block mb-1">Total Tiles Processed</span>
        <span className="font-display font-extrabold text-lg text-primaryText">{stats.total_tiles_processed.toLocaleString()}</span>
      </div>
      <div>
        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText block mb-1">Throughput</span>
        <span className="font-display font-extrabold text-lg text-primaryText">
          {stats.throughput_tiles_per_minute.toFixed(1)}
        </span>
        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText ml-2">tiles/min</span>
      </div>
    </div>
  );
}
