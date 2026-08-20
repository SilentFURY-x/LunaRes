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
    <form onSubmit={handleSubmit} className="border border-crater p-4 mt-4">
      <h3 className="text-sm font-display mb-3">Job Configuration</h3>

      <div className="flex flex-wrap gap-6 mb-4">
        {/* Model Profile */}
        <div>
          <label className="block text-xs text-regolith/50 mb-1">
            Model Profile
          </label>
          <select
            value={sensorProfile}
            onChange={(e) => setSensorProfile(e.target.value as SensorProfile)}
            className="bg-basalt border border-crater text-regolith text-sm px-2 py-1"
          >
            <option value={SensorProfile.Lunar}>Lunar Panchromatic</option>
            <option value={SensorProfile.EarthOptical}>Earth-optical</option>
            <option value={SensorProfile.SAR}>SAR</option>
          </select>
        </div>

        {/* Inference Mode */}
        <div>
          <label className="block text-xs text-regolith/50 mb-1">
            Inference Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as InferenceMode)}
            className="bg-basalt border border-crater text-regolith text-sm px-2 py-1"
          >
            <option value={InferenceMode.Fast}>
              Fast (Regression/GAN)
            </option>
            <option value={InferenceMode.HighFidelity}>
              High-Fidelity (Diffusion)
            </option>
          </select>
          <p className="text-xs text-regolith/40 mt-1">
            {mode === InferenceMode.Fast
              ? "Lower latency, deterministic output"
              : "Sharper perceptual detail, higher compute cost"}
          </p>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confidenceMap}
            onChange={(e) => setConfidenceMap(e.target.checked)}
          />
          <span>Generate confidence map</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={downstreamTask}
            onChange={(e) => setDownstreamTask(e.target.checked)}
          />
          <span>Run downstream task comparison (stretch)</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={disableSubmit}
          className={`px-4 py-2 text-sm font-display ${
            disableSubmit
              ? "bg-crater text-regolith/40 cursor-not-allowed"
              : "bg-signal text-void"
          }`}
        >
          {isSubmitting ? "Submitting…" : "Run Enhancement"}
        </button>

        <span className="text-xs text-regolith/50">
          {selectedSceneIds.length} scene{selectedSceneIds.length !== 1 ? "s" : ""} selected
        </span>
      </div>
    </form>
  );
}
