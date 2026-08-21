/**
 * Visual display of the Bhoonidhi API contract — shows the adapter's
 * documented request/response shape for judges.
 *
 * @see docs/frontend_layout.md section 6 — "Contract Definition UI"
 * @see backend/api/routers/pipeline.py
 */

const CONTRACT_ENDPOINTS = [
  {
    method: "GET",
    path: "/pipeline/search",
    description: "Search available products — mirrors Bhoonidhi's AOI/date/sensor search",
    params: [
      { name: "bbox", type: "string", example: "77.5,12.9,77.7,13.1" },
      { name: "sensor", type: "string", example: "TMC-2" },
      { name: "start_date", type: "string", example: "2024-01-01" },
      { name: "end_date", type: "string", example: "2024-12-31" },
    ],
    response: `{
  "adapter_mode": "mock" | "live",
  "results": [
    {
      "product_id": "CH2_TMC_NRR_20191007T1234",
      "sensor": "TMC-2",
      "acquisition_date": "2019-10-07",
      "resolution_m": 5.0,
      "thumbnail_url": "...",
      "footprint": { "type": "Polygon", "coordinates": [...] }
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/pipeline/fetch/{product_id}",
    description: "Fetch a product by ID, ingest as Scene, return scene_id",
    params: [{ name: "product_id", type: "path", example: "CH2_TMC_NRR_20191007T1234" }],
    response: `{
  "scene_id": "uuid",
  "product_id": "CH2_TMC_NRR_20191007T1234",
  "message": "Fetched and ingested"
}`,
  },
  {
    method: "POST",
    path: "/pipeline/push/{product_id}",
    description: "Push enhanced product back in ISRO-compatible form (GeoTIFF + metadata sidecar)",
    params: [{ name: "product_id", type: "path", example: "uuid" }],
    response: `{
  "product_id": "uuid",
  "status": "pushed",
  "message": "Enhanced GeoTIFF + metadata sidecar pushed"
}`,
  },
];

export default function ContractDisplay() {
  return (
    <div className="border border-divider p-4">
      <h3 className="text-sm font-display font-extrabold uppercase tracking-wider text-primaryText mb-3">Bhoonidhi API Contract</h3>
      <p className="text-xs text-secondaryText mb-4">
        These endpoints mirror Bhoonidhi's search/fetch/order pattern.
        The backend routes to a mock or live adapter transparently.
      </p>

      <div className="flex flex-col gap-4">
        {CONTRACT_ENDPOINTS.map((ep) => (
          <div key={ep.path} className="border border-divider p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-glassActive text-primaryText px-1">
                {ep.method}
              </span>
              <span className="text-sm font-mono text-secondaryText">{ep.path}</span>
            </div>
            <p className="text-xs text-secondaryText mb-2">{ep.description}</p>

            {ep.params.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-secondaryText">Parameters:</span>
                <div className="ml-2">
                  {ep.params.map((p) => (
                    <div key={p.name} className="text-xs font-mono text-secondaryText">
                      {p.name}: {p.type} (e.g., {p.example})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details>
              <summary className="text-xs text-primaryText cursor-pointer">
                Response shape
              </summary>
              <pre className="text-xs font-mono text-secondaryText mt-1 overflow-x-auto">
                {ep.response}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
