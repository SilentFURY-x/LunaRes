/**
 * Tile-based map viewer for deep zoom/pan of large rasters.
 *
 * Uses MapLibre to render XYZ tiles from the titiler COG tile server.
 * NEVER loads a full raster — requests tiles dynamically as user pans/zooms.
 *
 * Supports an optional overlay layer (confidence heatmap) with opacity control.
 *
 * @see docs/Architecture.md section 3.7 — Tile Server
 * @see docs/frontend_layout.md section 5 — "Navigation: Deep zoom and pan"
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { env } from "@/config/env";

interface TileMapViewProps {
  /** XYZ tile URL template for the primary layer (e.g., SR output) */
  tileUrl: string;
  /** Optional overlay XYZ tile URL (e.g., confidence heatmap) */
  overlayTileUrl?: string;
  /** Overlay opacity 0-1 */
  overlayOpacity?: number;
  /** Initial center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
}

/**
 * Build a full tile URL from a relative path.
 * If the tileUrl is already absolute, use as-is.
 */
function resolveTileUrl(tileUrl: string): string {
  if (tileUrl.startsWith("http")) return tileUrl;
  return `${env.TILE_SERVER_URL}${tileUrl}`;
}

export default function TileMapView({
  tileUrl,
  overlayTileUrl,
  overlayOpacity = 0.5,
  center = [0, 0],
  zoom = 2,
}: TileMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "primary-tiles": {
            type: "raster",
            tiles: [resolveTileUrl(tileUrl)],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "primary-layer",
            type: "raster",
            source: "primary-tiles",
          },
        ],
      },
      center,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only re-create map when tileUrl changes fundamentally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileUrl]);

  // Manage overlay layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const overlaySourceId = "overlay-tiles";
    const overlayLayerId = "overlay-layer";

    function addOverlay() {
      if (!overlayTileUrl) {
        // Remove overlay if it exists
        if (map!.getLayer(overlayLayerId)) map!.removeLayer(overlayLayerId);
        if (map!.getSource(overlaySourceId)) map!.removeSource(overlaySourceId);
        return;
      }

      if (map!.getSource(overlaySourceId)) {
        // Update existing source
        (map!.getSource(overlaySourceId) as maplibregl.RasterTileSource).setTiles?.([
          resolveTileUrl(overlayTileUrl),
        ]);
      } else {
        map!.addSource(overlaySourceId, {
          type: "raster",
          tiles: [resolveTileUrl(overlayTileUrl)],
          tileSize: 256,
        });
        map!.addLayer({
          id: overlayLayerId,
          type: "raster",
          source: overlaySourceId,
          paint: {
            "raster-opacity": overlayOpacity,
          },
        });
      }

      // Update opacity
      if (map!.getLayer(overlayLayerId)) {
        map!.setPaintProperty(overlayLayerId, "raster-opacity", overlayOpacity);
      }
    }

    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.on("load", addOverlay);
    }
  }, [overlayTileUrl, overlayOpacity]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: "500px" }}
    />
  );
}
