/**
 * Confidence heatmap overlay toggle + opacity slider.
 *
 * Controls whether the confidence/uncertainty map layer is visible
 * over the enhanced output, and at what opacity.
 *
 * @see docs/frontend_layout.md section 5 — "Toggle for Confidence Heatmap Overlay"
 * @see docs/PRD.md FR4 — per-pixel confidence/uncertainty map
 */

interface ConfidenceOverlayProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  /** True if no confidence map was generated for this product */
  unavailable?: boolean;
}

export default function ConfidenceOverlay({
  enabled,
  onToggle,
  opacity,
  onOpacityChange,
  unavailable,
}: ConfidenceOverlayProps) {
  if (unavailable) {
    return (
      <div className="px-3 py-2 border border-crater text-xs text-regolith/40">
        Confidence map not available for this product
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border border-crater">
      <label className="flex items-center gap-2 text-sm mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>Confidence Heatmap</span>
      </label>

      {enabled && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-regolith/50">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="flex-1"
          />
          <span className="text-xs font-mono text-regolith/60 w-8">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
