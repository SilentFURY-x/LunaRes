/**
 * Workspace Page — combines upload, catalog browse, and job configuration.
 *
 * This is the primary input flow:
 *   Tab A (Upload): DropZone → file validation → upload scene
 *   Tab B (Catalog): CatalogMap + CatalogFilters → scene search → multi-select
 *   Below: JobConfigForm → submit job → navigate to dashboard
 *
 * @see docs/AppFlow.md steps 2-3
 * @see docs/frontend_layout.md section 3 — Workspace
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TabSwitcher from "@/components/shared/TabSwitcher";
import DropZone from "@/components/upload/DropZone";
import CatalogMap from "@/components/catalog/CatalogMap";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import SceneResultList from "@/components/catalog/SceneResultList";
import JobConfigForm from "@/components/job/JobConfigForm";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useSearchScenes } from "@/hooks/useScenes";
import { useSubmitJob } from "@/hooks/useJobs";
import { showToast } from "@/components/shared/Toast";
import type { JobCreate, SceneSearchParams, SensorProfile } from "@/api/types";

const TABS = [
  { id: "upload", label: "Upload File" },
  { id: "catalog", label: "Browse Catalog" },
];

export default function WorkspacePage() {
  const navigate = useNavigate();

  // ── Upload tab state ──
  const { upload, isUploading, error: uploadError, scene: uploadedScene } = useFileUpload();

  // ── Catalog tab state ──
  const [searchParams, setSearchParams] = useState<SceneSearchParams>({});
  const { data: catalogScenes, isLoading: searchLoading } = useSearchScenes(searchParams);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());

  // ── Job submission ──
  const submitJobMutation = useSubmitJob();

  // Derive scene IDs available for job submission
  const uploadedId = uploadedScene ? (uploadedScene.id || (uploadedScene as any).scene_id) : null;
  const allSelectedIds: string[] = uploadedId
    ? [uploadedId, ...Array.from(selectedSceneIds)]
    : Array.from(selectedSceneIds);

  // ── Handlers ──
  const handleFileSelected = useCallback(
    (file: File) => {
      upload({
        file,
        meta: { sensor_profile: "lunar" as SensorProfile },
      });
    },
    [upload],
  );

  const handleAoiDrawn = useCallback(
    (bbox: string) => {
      setSearchParams((prev) => ({ ...prev, bbox }));
    },
    [],
  );

  const handleFilterChange = useCallback(
    (filters: { sensor?: SensorProfile; startDate?: string; endDate?: string }) => {
      setSearchParams((prev) => ({
        ...prev,
        sensor: filters.sensor,
        start_date: filters.startDate,
        end_date: filters.endDate,
      }));
    },
    [],
  );

  const handleSubmitJob = useCallback(
    (config: JobCreate) => {
      submitJobMutation.mutate(config, {
        onSuccess: (job) => {
          showToast(`Job ${job.job_id.slice(0, 8)} submitted`, "success");
          navigate("/jobs");
        },
        onError: (err) => {
          showToast(`Job submission failed: ${err.message}`, "error");
        },
      });
    },
    [submitJobMutation, navigate],
  );

  return (
    <div className="px-6 py-12 max-w-4xl mx-auto">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wider text-primaryText mb-8">
        Enhance an Image
      </h2>

      <TabSwitcher tabs={TABS} defaultTab="upload">
        {(activeTab) => (
          <div>
            {activeTab === "upload" && (
              <div className="py-6">
                <DropZone
                  onFileSelected={handleFileSelected}
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="mt-4 font-mono font-medium text-xs uppercase tracking-widest text-secondaryText">
                    Uploading & Registering Scene…
                  </p>
                )}
                {uploadError && (
                  <p className="mt-4 font-mono font-medium text-xs uppercase tracking-widest text-red-600 dark:text-red-400">
                    Upload Failed: {uploadError.message}
                  </p>
                )}
                {uploadedId && (
                  <p className="mt-4 font-mono font-medium text-xs uppercase tracking-widest text-green-600 dark:text-green-400">
                    ✓ Scene {uploadedId.slice(0, 8)} ready for enhancement
                  </p>
                )}
              </div>
            )}

            {activeTab === "catalog" && (
              <div className="py-6">
                <CatalogFilters onFilterChange={handleFilterChange} />
                <div className="mt-6">
                  <CatalogMap
                    onAoiDrawn={handleAoiDrawn}
                    sceneFootprints={
                      catalogScenes
                        ?.filter((s) => s.footprint)
                        .map((s) => ({
                          id: s.id,
                          coordinates: s.footprint!.coordinates,
                        })) ?? []
                    }
                  />
                </div>
                <div className="mt-6 border-t border-divider pt-6">
                  <SceneResultList
                    scenes={catalogScenes ?? []}
                    selectedIds={selectedSceneIds}
                    onSelectionChange={setSelectedSceneIds}
                    isLoading={searchLoading}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </TabSwitcher>

      {/* Job Configuration — always visible below tabs */}
      <div className="border-t border-divider pt-8 mt-4">
        <JobConfigForm
          selectedSceneIds={allSelectedIds}
          onSubmit={handleSubmitJob}
          isSubmitting={submitJobMutation.isPending}
        />
      </div>
    </div>
  );
}
