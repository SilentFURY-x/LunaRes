// docs/AppFlow.md steps 2-3: input selection (upload or catalog browse) +
// job configuration (sensor profile, fast vs high-fidelity mode, confidence
// map toggle).
export default function UploadPage() {
  return (
    <div className="px-6 py-10">
      <h2 className="font-display text-xl mb-4">Enhance an image</h2>
      {/* TODO: drag-and-drop upload (Tab A) + map-based AOI catalog browse (Tab B)
          TODO: job config form -> POST /jobs via React Query mutation */}
    </div>
  );
}
