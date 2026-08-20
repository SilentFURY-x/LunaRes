/**
 * Drag-and-drop file upload zone.
 *
 * Accepts files via drag-drop or click-to-browse. Validates format/size
 * on drop, then calls onFileSelected with the validated file.
 *
 * @see docs/frontend_layout.md section 3 — "Drag-and-drop zone"
 * @see src/components/upload/FormatValidator.ts
 */

import { useState, useRef, useCallback } from "react";
import {
  validateFile,
  SUPPORTED_FORMATS_DISPLAY,
} from "./FormatValidator";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileSelected, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const result = validateFile(file);
      if (!result.valid) {
        setError(result.error ?? "Invalid file");
        setSelectedName(null);
        return;
      }
      setError(null);
      setSelectedName(file.name);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={disabled ? undefined : handleClick}
        className={`border-2 border-dashed px-6 py-10 text-center cursor-pointer ${
          isDragOver ? "border-signal bg-signal/5" : "border-crater"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".tif,.tiff,.png,.jpg,.jpeg,.img"
          onChange={handleInputChange}
          disabled={disabled}
        />

        {selectedName ? (
          <p className="text-sm text-signal">{selectedName}</p>
        ) : (
          <div>
            <p className="text-sm text-regolith/70 mb-2">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-regolith/40">
              Supported: {SUPPORTED_FORMATS_DISPLAY} · Max 500 MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-flare">{error}</p>
      )}
    </div>
  );
}
