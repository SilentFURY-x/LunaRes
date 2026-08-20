/**
 * Generic tab switcher — used for Upload/Catalog tabs and anywhere
 * a tabbed UI is needed.
 *
 * Props in, callbacks out. Zero styling beyond structural layout.
 */

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export default function TabSwitcher({
  tabs,
  defaultTab,
  onTabChange,
  children,
}: TabSwitcherProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");

  function handleClick(tabId: string) {
    setActive(tabId);
    onTabChange?.(tabId);
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-crater mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={`px-4 py-2 text-sm font-body ${
              active === tab.id
                ? "border-b-2 border-signal text-signal"
                : "text-regolith/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
