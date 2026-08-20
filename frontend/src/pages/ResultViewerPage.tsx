// docs/AppFlow.md step 5: the centerpiece screen. Tile-based before/after
// swipe comparison (react-compare-slider) + toggleable confidence heatmap
// layer, both backed by the titiler COG tile server — never load the full
// raster client-side.
export default function ResultViewerPage() {
  return (
    <div className="px-6 py-10">
      <h2 className="font-display text-xl mb-4">Result</h2>
      {/* TODO: <ReactCompareSlider> with LR tile layer vs SR tile layer
          TODO: confidence overlay toggle (opacity slider)
          TODO: metrics panel (PSNR/SSIM/LPIPS or no-reference score)
          TODO: download actions (GeoTIFF / PNG / PDF report) */}
    </div>
  );
}
