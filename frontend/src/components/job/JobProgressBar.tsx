/**
 * Tile-by-tile progress bar for a job.
 *
 * @see docs/frontend_layout.md section 4 — "Progress Bar"
 */

interface JobProgressBarProps {
  tilesComplete: number;
  tilesTotal: number;
}

export default function JobProgressBar({ tilesComplete, tilesTotal }: JobProgressBarProps) {
  const pct = tilesTotal > 0 ? Math.round((tilesComplete / tilesTotal) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-crater">
        <div
          className="h-full bg-signal"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-regolith/60 font-mono w-16 text-right">
        {tilesComplete}/{tilesTotal}
      </span>
    </div>
  );
}
