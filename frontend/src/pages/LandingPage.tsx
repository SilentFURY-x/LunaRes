/**
 * Landing Page — orient the user, build credibility, set expectations.
 *
 * @see docs/AppFlow.md step 1
 * @see docs/frontend_layout.md section 2 — Landing / Home
 */

import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="px-6 py-16 max-w-3xl">
      {/* Hero */}
      <h1 className="font-display text-3xl mb-4">
        LunaRes
      </h1>
      <p className="text-lg text-regolith/80 mb-6">
        AI Framework for Satellite &amp; Planetary Image Enhancement
      </p>

      {/* CTA */}
      <Link
        to="/workspace"
        className="inline-block bg-signal text-void px-6 py-2 text-sm font-display mb-10"
      >
        Enhance an Image
      </Link>

      {/* Explainer sections — crucial for judges */}
      <div className="flex flex-col gap-6">
        <ExplainerSection
          title="Real Paired Training Data"
          description="Models trained on real paired Chandrayaan-2 TMC-2 (5m) / OHRC (0.25m) imagery — genuine optical degradation, not synthetic bicubic downsampling. This is the primary technical differentiator."
        />

        <ExplainerSection
          title="Uncertainty Quantification"
          description="Every enhanced output ships with a per-pixel confidence/uncertainty heatmap. Scientists can see exactly where the model is confident vs. guessing — critical for scientific trust over decorative upscaling."
        />

        <ExplainerSection
          title="ISRO Pipeline Integration"
          description="Architecture built around Bhoonidhi's actual search/fetch/order API contract. Adapter pattern supports both live API access and mock demo mode, transparently."
        />

        <ExplainerSection
          title="Scalable by Design"
          description="Async job queue with horizontally-scalable inference workers. Batch processing of multiple scenes as a single trackable job. Tile-parallel inference across workers/GPUs."
        />

        {/* Limitations note — honest disclosure per docs */}
        <div className="border-t border-crater pt-4 mt-2">
          <h3 className="text-sm font-display text-regolith/50 mb-1">
            Known Limitations (MVP Scope)
          </h3>
          <ul className="text-xs text-regolith/40 list-disc list-inside">
            <li>Assumes pre-calibrated radiometric input</li>
            <li>MVP supports 3 sensor profiles (Lunar, Earth-optical, SAR)</li>
            <li>Diffusion-based high-fidelity mode is a stretch feature</li>
            <li>Pipeline adapter demo may use mock catalog if Bhoonidhi API approval is pending</li>
          </ul>
        </div>

        {/* Data attribution */}
        <div className="border-t border-crater pt-4">
          <p className="text-xs text-regolith/40">
            Research based on Chandrayaan-2 data archived at ISSDC, with due credit to
            ISRO. Earth-observation data from Bhoonidhi, Sentinel, and Landsat archives.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExplainerSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-display text-signal mb-1">{title}</h3>
      <p className="text-sm text-regolith/70">{description}</p>
    </div>
  );
}
