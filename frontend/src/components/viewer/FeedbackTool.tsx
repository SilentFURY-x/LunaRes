/**
 * Feedback tool (stretch) — "Flag this region" bounding box for bad reconstructions.
 *
 * Allows scientists to draw a box over suspect areas and leave a note.
 * Stored in the feedback table for future model fine-tuning.
 *
 * @see docs/AppFlow.md secondary flow 4 — Human-in-the-loop feedback
 * @see backend/db/models.py Feedback table
 */

import { useState } from "react";
import { submitFeedback } from "@/api/endpoints";
import type { FeedbackCreate, GeoJSONPolygon } from "@/api/types";

interface FeedbackToolProps {
  productId: string;
}

export default function FeedbackTool({ productId }: FeedbackToolProps) {
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      // Placeholder region — in a real implementation, this would come from
      // a drawing tool on the map viewer. For now, we accept just a text note.
      const placeholderRegion: GeoJSONPolygon = {
        type: "Polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const feedback: FeedbackCreate = {
        product_id: productId,
        region: placeholderRegion,
        note: note.trim(),
      };

      await submitFeedback(feedback);
      setSubmitted(true);
      setNote("");
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border border-crater p-3">
      <h4 className="text-xs text-regolith/50 mb-2 font-display">
        Flag Region (Feedback)
      </h4>

      {submitted ? (
        <p className="text-sm text-green-400">Feedback submitted. Thank you.</p>
      ) : (
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the issue with this region…"
            className="w-full bg-basalt border border-crater text-regolith text-sm px-2 py-1 mb-2"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !note.trim()}
            className="text-xs text-flare border border-flare px-2 py-1"
          >
            {isSubmitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
