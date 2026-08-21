/**
 * Landing Page — orient the user, build credibility, set expectations.
 *
 * @see docs/AppFlow.md step 1
 * @see docs/frontend_layout.md section 2 — Landing / Home
 */

import { useNavigate } from "react-router-dom";
import { RippleButton } from "@/components/ui/ripple-button";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex-1 flex items-center overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 px-6 py-16 max-w-3xl mx-auto w-full">
        {/* Hero */}
        <h1 className="font-display font-extrabold text-4xl uppercase tracking-wider text-primaryText mb-4">
          LunaRes
        </h1>
        <p className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText mb-8">
          AI Framework for Satellite &amp; Planetary Image Enhancement
        </p>

        {/* CTA */}
        <RippleButton
          onClick={() => navigate("/workspace")}
          className="bg-ctaBtn text-primaryText font-medium text-sm tracking-tight px-8 py-3 mb-12 rounded hover:opacity-80 transition-colors border-none"
        >
          Enhance an Image
        </RippleButton>

        {/* Explainer sections — crucial for judges */}
        <div className="flex flex-col gap-8">
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
          <div className="border-t border-divider pt-6 mt-4">
            <h3 className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText mb-3">
              Known Limitations (MVP Scope)
            </h3>
            <ul className="font-medium text-sm tracking-tight text-secondaryText list-disc list-inside space-y-1">
              <li>Assumes pre-calibrated radiometric input</li>
              <li>MVP supports 3 sensor profiles (Lunar, Earth-optical, SAR)</li>
              <li>Diffusion-based high-fidelity mode is a stretch feature</li>
              <li>Pipeline adapter demo may use mock catalog if Bhoonidhi API approval is pending</li>
            </ul>
          </div>

          {/* Data attribution */}
          <div className="border-t border-divider pt-6">
            <p className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">
              Research based on Chandrayaan-2 data archived at ISSDC, with due credit to
              ISRO. Earth-observation data from Bhoonidhi, Sentinel, and Landsat archives.
            </p>
          </div>
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
      <h3 className="font-display font-extrabold text-lg uppercase tracking-wider text-primaryText mb-2">
        {title}
      </h3>
      <p className="font-medium text-sm tracking-tight text-secondaryText">
        {description}
      </p>
    </div>
  );
}
