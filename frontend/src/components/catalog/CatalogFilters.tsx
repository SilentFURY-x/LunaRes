/**
 * Catalog search filters: sensor dropdown + date range pickers.
 *
 * @see docs/frontend_layout.md section 3 Tab B — Filters
 */

import { useState } from "react";
import { SensorProfile } from "@/api/types";
import { RippleButton } from '@/components/ui/ripple-button';

interface CatalogFiltersProps {
  onFilterChange: (filters: {
    sensor?: SensorProfile;
    startDate?: string;
    endDate?: string;
  }) => void;
}

const SENSOR_OPTIONS: Array<{ value: SensorProfile | ""; label: string }> = [
  { value: "", label: "All Sensors" },
  { value: SensorProfile.Lunar, label: "Lunar (TMC-2 / OHRC)" },
  { value: SensorProfile.EarthOptical, label: "Earth Optical (Landsat / Sentinel)" },
  { value: SensorProfile.SAR, label: "SAR" },
];

export default function CatalogFilters({ onFilterChange }: CatalogFiltersProps) {
  const [sensor, setSensor] = useState<SensorProfile | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleApply() {
    onFilterChange({
      sensor: sensor || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-secondaryText mb-1">Sensor</label>
        <select
          value={sensor}
          onChange={(e) => setSensor(e.target.value as SensorProfile | "")}
          className="bg-background border border-divider text-secondaryText text-sm px-2 py-1"
        >
          {SENSOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-secondaryText mb-1">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-background border border-divider text-secondaryText text-sm px-2 py-1"
        />
      </div>

      <div>
        <label className="block text-xs text-secondaryText mb-1">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-background border border-divider text-secondaryText text-sm px-2 py-1"
        />
      </div>

      <RippleButton
        onClick={handleApply}
        className="px-3 py-1 text-sm border border-divider text-primaryText"
      >
        Search
      </RippleButton>
    </div>
  );
}
