/**
 * Before/after comparison slider — synchronized LR vs SR view.
 *
 * Wraps react-compare-slider. Both sides are tile-backed images
 * so large rasters don't crash the browser.
 *
 * @see docs/frontend_layout.md section 5 — "Split-Pane / Swipe Slider"
 * @see docs/AppFlow.md step 5 — "Split-pane / swipe-slider"
 */

import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

interface CompareSliderProps {
  /** URL for the low-res input preview image */
  lrImageUrl: string;
  /** URL for the super-resolution enhanced output preview image */
  srImageUrl: string;
  /** Alt text for accessibility */
  lrLabel?: string;
  srLabel?: string;
}

export default function CompareSlider({
  lrImageUrl,
  srImageUrl,
  lrLabel = "Low Resolution (Input)",
  srLabel = "Enhanced (Output)",
}: CompareSliderProps) {
  return (
    <div>
      <ReactCompareSlider
        itemOne={
          <ReactCompareSliderImage src={lrImageUrl} alt={lrLabel} />
        }
        itemTwo={
          <ReactCompareSliderImage src={srImageUrl} alt={srLabel} />
        }
        style={{ width: "100%", height: "500px" }}
      />
      <div className="flex justify-between text-xs text-regolith/50 mt-1 px-1">
        <span>{lrLabel}</span>
        <span>{srLabel}</span>
      </div>
    </div>
  );
}
