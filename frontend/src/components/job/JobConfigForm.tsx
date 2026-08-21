/**
 * Job configuration form — model profile, inference mode, toggles, submit.
 *
 * Collects all configuration needed for POST /jobs/ and calls onSubmit
 * with the JobCreate payload.
 *
 * @see docs/frontend_layout.md section 3 Step 2 — Job Configuration Panel
 * @see backend/api/schemas.py JobCreate
 */

import { useState } from "react";
import { InferenceMode, SensorProfile } from "@/api/types";
import type { JobCreate } from "@/api/types";
import { RippleButton } from '@/components/ui/ripple-button';

interface JobConfigFormProps {
  /** Scene IDs selected for this job (from upload or catalog selection) */
  selectedSceneIds: string[];
  /** Called with the complete job config when user clicks submit */
  onSubmit: (config: JobCreate) => void;
  /** True while the submit mutation is in progress */
  isSubmitting?: boolean;
  /** Auto-suggested sensor profile based on input metadata */
  suggestedProfile?: SensorProfile;
}

export default function JobConfigForm({
  selectedSceneIds,
  onSubmit,
  isSubmitting,
  suggestedProfile,
}: JobConfigFormProps) {
  const [sensorProfile, setSensorProfile] = useState<SensorProfile>(
    suggestedProfile ?? SensorProfile.Lunar,
  );
  const [mode, setMode] = useState<InferenceMode>(InferenceMode.Fast);
  const [confidenceMap, setConfidenceMap] = useState(true);
  const [downstreamTask, setDownstreamTask] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSceneIds.length === 0) return;

    onSubmit({
      scene_ids: selectedSceneIds,
      inference_mode: mode,
      generate_confidence_map: confidenceMap,
      run_downstream_task_comparison: downstreamTask,
    });
  }

  const disableSubmit = selectedSceneIds.length === 0 || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="pt-2">
      <h3 className="font-display font-extrabold text-lg uppercase tracking-wider text-primaryText mb-6">Job Configuration</h3>

      <div className="flex flex-wrap gap-8 mb-6">
        {/* Model Profile */}
        <div>
          <label className="block font-mono font-medium text-xs uppercase tracking-widest text-secondaryText mb-2">
            Model Profile
          </label>
          <select
            value={sensorProfile}
            onChange={(e) => setSensorProfile(e.target.value as SensorProfile)}
            className="bg-background border border-divider text-secondaryText font-medium text-sm tracking-tight px-3 py-2 focus:outline-none focus:border-zinc-400 transition-colors"
          >
            <option value={SensorProfile.Lunar}>Lunar Panchromatic</option>
            <option value={SensorProfile.EarthOptical}>Earth-optical</option>
            <option value={SensorProfile.SAR}>SAR</option>
          </select>
        </div>

        {/* Inference Mode */}
        <div>
          <label className="block font-mono font-medium text-xs uppercase tracking-widest text-secondaryText mb-2">
            Inference Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as InferenceMode)}
            className="bg-background border border-divider text-secondaryText font-medium text-sm tracking-tight px-3 py-2 focus:outline-none focus:border-zinc-400 transition-colors"
          >
            <option value={InferenceMode.Fast}>
              Fast (Regression/GAN)
            </option>
            <option value={InferenceMode.HighFidelity}>
              High-Fidelity (Diffusion)
            </option>
          </select>
          <p className="font-mono font-medium text-xs uppercase tracking-widest text-zinc-500 mt-2">
            {mode === InferenceMode.Fast
              ? "Lower latency, deterministic output"
              : "Sharper perceptual detail, higher compute cost"}
          </p>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-8 mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confidenceMap}
            onChange={(e) => setConfidenceMap(e.target.checked)}
            className="accent-zinc-400"
          />
          <span className="font-medium text-sm tracking-tight text-secondaryText">Generate confidence map</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={downstreamTask}
            onChange={(e) => setDownstreamTask(e.target.checked)}
            className="accent-zinc-400"
          />
          <span className="font-medium text-sm tracking-tight text-secondaryText">Run downstream task comparison (stretch)</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <RippleButton
          type="submit"
          disabled={disableSubmit}
          className={`px-8 py-3 font-medium text-sm tracking-tight rounded transition-colors ${
            disableSubmit
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-ctaBtn text-primaryText hover:opacity-80"
          }`}
        >
          {isSubmitting ? "Submitting…" : "Run Enhancement"}
        </RippleButton>

        <span className="font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">
          {selectedSceneIds.length} scene{selectedSceneIds.length !== 1 ? "s" : ""} selected
        </span>
      </div>
    </form>
  );
}
