/**
 * SHA-256 file hasher using the Web Crypto API.
 *
 * Used for client-side deduplication: if the backend already has an image
 * with the same hash, it returns the existing Scene ID instead of re-processing.
 *
 * @see docs/frontend_layout.md section 3 — "SHA-256 deduplication"
 * @see src/hooks/useFileUpload.ts (consumer)
 */

/**
 * Compute the SHA-256 hash of a File as a hex string.
 * Uses the Web Crypto API (available in all modern browsers).
 */
export async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
