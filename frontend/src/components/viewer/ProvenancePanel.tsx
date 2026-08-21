/**
 * Provenance panel — source sensor, acquisition date, product ID, model version.
 *
 * @see docs/frontend_layout.md section 5 — "Provenance"
 * @see docs/PRD.md NFR Explainability — every output ships with model version,
 *      training-data provenance, and confidence metrics
 */

import type { ProductResponse } from "@/api/types";

interface ProvenancePanelProps {
  product: ProductResponse;
}

export default function ProvenancePanel({ product }: ProvenancePanelProps) {
  return (
    <div className="border border-divider p-3">
      <h4 className="text-xs text-secondaryText mb-2 font-display font-extrabold uppercase tracking-wider text-primaryText">Provenance</h4>
      <dl className="flex flex-col gap-1 text-sm">
        <ProvenanceRow label="Source Sensor" value={product.source_sensor} />
        <ProvenanceRow
          label="Acquisition Date"
          value={
            product.acquisition_date
              ? new Date(product.acquisition_date).toLocaleDateString()
              : "Unknown"
          }
        />
        <ProvenanceRow
          label="Product ID"
          value={product.product_source_id ?? "N/A"}
        />
        <ProvenanceRow label="Model Version" value={product.model_version} />
      </dl>

      {/* Downstream task delta (stretch) */}
      {product.downstream_delta && (
        <div className="mt-3 border-t border-divider pt-2">
          <h4 className="text-xs text-secondaryText mb-1 font-display font-extrabold uppercase tracking-wider text-primaryText">
            Downstream Task Delta
          </h4>
          <p className="text-sm text-secondaryText">
            {product.downstream_delta.description}
          </p>
          <p className="text-xs text-secondaryText mt-1">
            Before: {product.downstream_delta.before_count} →
            After: {product.downstream_delta.after_count}
          </p>
        </div>
      )}
    </div>
  );
}

function ProvenanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-secondaryText">{label}</dt>
      <dd className="font-mono text-secondaryText">{value}</dd>
    </div>
  );
}
