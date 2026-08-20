/**
 * Client-side file format and size validation.
 *
 * Runs before upload to reject unsupported files early,
 * avoiding unnecessary network traffic.
 *
 * @see docs/frontend_layout.md section 3 — supported formats
 * @see docs/PRD.md FR1 — GeoTIFF, PNG/JPEG, PDS3/PDS4
 */

/** Supported file extensions (lowercase, including dot) */
const ALLOWED_EXTENSIONS = [".tif", ".tiff", ".png", ".jpg", ".jpeg", ".img"];

/** Maximum file size in bytes (500 MB — large raster limit for upload) */
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate a file's extension and size before uploading */
export function validateFile(file: File): ValidationResult {
  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf("."));

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format "${ext}". Supported: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large (${sizeMB} MB). Maximum: ${limitMB} MB`,
    };
  }

  return { valid: true };
}

/** Human-readable list of supported formats for display */
export const SUPPORTED_FORMATS_DISPLAY = ".TIF, .PNG, .JPG, PDS .IMG";
