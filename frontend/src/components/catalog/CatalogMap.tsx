/**
 * Interactive map for catalog browse — draw AOI (polygon/rectangle)
 * to spatially search scenes.
 *
 * Uses MapLibre GL JS. Exposes onAoiDrawn(bbox) callback when the user
 * draws a selection area.
 *
 * IMPORTANT: MapLibre requires the CSS to be imported. Teammates must
 * ensure maplibre-gl/dist/maplibre-gl.css is imported (done in index.css
 * or here). The map container MUST have a fixed height.
 *
 * @see docs/frontend_layout.md section 3 Tab B — "Interactive map"
 * @see backend/api/routers/scenes.py search_scenes (PostGIS ST_Intersects)
 */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface CatalogMapProps {
  /** Called when user finishes drawing an AOI. bbox = "minLon,minLat,maxLon,maxLat" */
  onAoiDrawn: (bbox: string) => void;
  /** Optionally render scene footprints on the map */
  sceneFootprints?: Array<{
    id: string;
    coordinates: number[][][];
  }>;
}

export default function CatalogMap({ onAoiDrawn, sceneFootprints }: CatalogMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [drawMode, setDrawMode] = useState<"rectangle" | null>(null);
  const drawStartRef = useRef<maplibregl.LngLat | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [78.9, 20.5], // Default to India (for ISRO context)
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add scene footprints layer when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sceneFootprints?.length) return;

    const sourceId = "scene-footprints";
    const layerId = "scene-footprints-fill";

    // Wait for map style to load
    function addFootprints() {
      const m = mapRef.current;
      if (!m) return;
      if (m.getSource(sourceId)) {
        (m.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: sceneFootprints!.map((s) => ({
            type: "Feature" as const,
            properties: { id: s.id },
            geometry: { type: "Polygon" as const, coordinates: s.coordinates },
          })),
        });
      } else {
        m.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: sceneFootprints!.map((s) => ({
              type: "Feature" as const,
              properties: { id: s.id },
              geometry: { type: "Polygon" as const, coordinates: s.coordinates },
            })),
          },
        });
        m.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#5FA8D3",
            "fill-opacity": 0.2,
          },
        });
        m.addLayer({
          id: `${layerId}-outline`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#5FA8D3",
            "line-width": 1,
          },
        });
      }
    }

    if (map.isStyleLoaded()) {
      addFootprints();
    } else {
      map.on("load", addFootprints);
    }
  }, [sceneFootprints]);

  // Rectangle draw tool
  useEffect(() => {
    const map = mapRef.current;
    if (!map || drawMode !== "rectangle") return;

    const canvas = map.getCanvasContainer();
    canvas.style.cursor = "crosshair";

    function onMouseDown(e: maplibregl.MapMouseEvent) {
      drawStartRef.current = e.lngLat;
      map!.dragPan.disable();
    }

    function onMouseUp(e: maplibregl.MapMouseEvent) {
      const start = drawStartRef.current;
      if (!start) return;

      const end = e.lngLat;
      const bbox = [
        Math.min(start.lng, end.lng),
        Math.min(start.lat, end.lat),
        Math.max(start.lng, end.lng),
        Math.max(start.lat, end.lat),
      ].join(",");

      onAoiDrawn(bbox);
      drawStartRef.current = null;
      map!.dragPan.enable();
      canvas.style.cursor = "";
      setDrawMode(null);
    }

    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      canvas.style.cursor = "";
      map.dragPan.enable();
    };
  }, [drawMode, onAoiDrawn]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setDrawMode(drawMode === "rectangle" ? null : "rectangle")}
          className={`px-3 py-1 text-xs border ${
            drawMode === "rectangle"
              ? "border-signal text-signal"
              : "border-crater text-regolith/60"
          }`}
        >
          {drawMode === "rectangle" ? "Drawing…" : "Draw Rectangle (AOI)"}
        </button>
      </div>

      {/* Map container — MUST have explicit height */}
      <div ref={containerRef} className="w-full" style={{ height: "400px" }} />
    </div>
  );
}
