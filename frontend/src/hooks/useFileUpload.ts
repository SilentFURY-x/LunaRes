/**
 * Hook: file upload with client-side SHA-256 hashing for deduplication.
 *
 * Computes a SHA-256 hash of the file content before upload. The backend
 * uses this to deduplicate — uploading the same image twice returns the
 * existing Scene ID instead of re-processing.
 *
 * @see backend/api/routers/scenes.py POST /scenes/upload
 * @see src/components/upload/FileHasher.ts (SHA-256 implementation)
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadScene } from "@/api/endpoints";
import type { SceneCreateMeta, SceneSummary } from "@/api/types";
import { computeSha256 } from "@/components/upload/FileHasher";

interface UploadParams {
  file: File;
  meta: SceneCreateMeta;
}

export function useFileUpload() {
  const queryClient = useQueryClient();
  const [hash, setHash] = useState<string | null>(null);

  const mutation = useMutation<SceneSummary, Error, UploadParams>({
    mutationFn: async ({ file, meta }) => {
      // Step 1: Compute SHA-256 hash client-side
      const sha = await computeSha256(file);
      setHash(sha);

      // Step 2: Upload (backend uses hash to deduplicate)
      return uploadScene(file, meta);
    },
    onSuccess: () => {
      // Invalidate scene cache so catalog browse picks up the new scene
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
    },
  });

  return {
    upload: mutation.mutate,
    uploadAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    scene: mutation.data,
    hash,
    reset: mutation.reset,
  };
}
