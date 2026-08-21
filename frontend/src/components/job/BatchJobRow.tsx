/**
 * Expandable batch job row — shows per-scene progress within a batch.
 *
 * @see docs/frontend_layout.md section 4 — "Batch Jobs: expandable rows"
 */

import { useState } from "react";
import type { SceneProgress } from "@/api/types";
import StatusBadge from "./StatusBadge";
import JobProgressBar from "./JobProgressBar";
import { RippleButton } from '@/components/ui/ripple-button';

interface BatchJobRowProps {
  sceneProgress: SceneProgress[];
}

export default function BatchJobRow({ sceneProgress }: BatchJobRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (sceneProgress.length === 0) return null;

  return (
    <div className="mt-1">
      <RippleButton
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primaryText"
      >
        {expanded ? "▾ Hide" : "▸ Show"} {sceneProgress.length} scene{sceneProgress.length !== 1 ? "s" : ""}
      </RippleButton>

      {expanded && (
        <div className="ml-4 mt-1 flex flex-col gap-1">
          {sceneProgress.map((sp) => (
            <div key={sp.scene_id} className="flex items-center gap-3 text-xs">
              <span className="text-secondaryText w-24 truncate font-mono">
                {sp.scene_id.slice(0, 8)}
              </span>
              <StatusBadge status={sp.status} />
              <div className="flex-1">
                <JobProgressBar
                  tilesComplete={sp.tiles_complete}
                  tilesTotal={sp.tiles_total}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
