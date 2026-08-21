/**
 * Scene search results list with thumbnails and multi-select checkboxes.
 *
 * Used in the catalog browse tab. Multi-select enables batch processing.
 *
 * @see docs/frontend_layout.md section 3 Tab B — "Results Panel"
 */

import type { SceneSummary } from "@/api/types";
import { RippleButton } from '@/components/ui/ripple-button';

interface SceneResultListProps {
  scenes: SceneSummary[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isLoading?: boolean;
}

export default function SceneResultList({
  scenes,
  selectedIds,
  onSelectionChange,
  isLoading,
}: SceneResultListProps) {
  function toggleScene(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  function toggleAll() {
    if (selectedIds.size === scenes.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(scenes.map((s) => s.id)));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-secondaryText py-4">Searching scenes…</p>;
  }

  if (scenes.length === 0) {
    return <p className="text-sm text-secondaryText py-4">No scenes found. Draw an AOI on the map to search.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-secondaryText">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""} found
        </span>
        <RippleButton
          onClick={toggleAll}
          className="text-xs text-primaryText"
        >
          {selectedIds.size === scenes.length ? "Deselect all" : "Select all"}
        </RippleButton>
      </div>

      <div className="flex flex-col gap-1">
        {scenes.map((scene) => (
          <label
            key={scene.id}
            className="flex items-center gap-3 px-3 py-2 border border-divider cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(scene.id)}
              onChange={() => toggleScene(scene.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-secondaryText truncate">
                {scene.product_id ?? scene.id}
              </p>
              <p className="text-xs text-secondaryText">
                {scene.sensor_profile}
                {scene.gsd_meters ? ` · ${scene.gsd_meters}m GSD` : ""}
                {scene.acquisition_time
                  ? ` · ${new Date(scene.acquisition_time).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            {scene.thumbnail_url && (
              <img
                src={scene.thumbnail_url}
                alt=""
                className="w-12 h-12 object-cover"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
