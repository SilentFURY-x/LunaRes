/**
 * Hooks for fetching product details and download URLs.
 *
 * @see backend/api/routers/products.py (not yet built — stub endpoints)
 * @see src/api/types.ts ProductResponse
 */

import { useQuery } from "@tanstack/react-query";
import { getProduct, getDownloadUrl, getProductByJobScene } from "@/api/endpoints";
import type { ProductResponse, ExportFormat } from "@/api/types";

/** Fetch full product details by product ID */
export function useProduct(productId: string | undefined) {
  return useQuery<ProductResponse>({
    queryKey: ["products", productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });
}

/** Fetch product by job ID + scene ID combination */
export function useProductByJobScene(
  jobId: string | undefined,
  sceneId: string | undefined,
) {
  return useQuery<ProductResponse>({
    queryKey: ["products", "by-job", jobId, "scene", sceneId],
    queryFn: () => getProductByJobScene(jobId!, sceneId!),
    enabled: !!jobId && !!sceneId,
  });
}

/**
 * Get a time-limited presigned download URL for a product.
 * Only fetches when explicitly enabled (e.g. on button click).
 */
export function useDownloadUrl(
  productId: string | undefined,
  format: ExportFormat,
  enabled: boolean,
) {
  return useQuery<{ url: string }>({
    queryKey: ["products", productId, "download", format],
    queryFn: () => getDownloadUrl(productId!, format),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // Presigned URLs are valid for ~15 min; cache for 5
  });
}
