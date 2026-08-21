/**
 * Generic tab switcher — used for Upload/Catalog tabs and anywhere
 * a tabbed UI is needed.
 *
 * Props in, callbacks out. Zero styling beyond structural layout.
 */

import { useState } from "react";
import { RippleButton } from '@/components/ui/ripple-button';

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
      <div className="flex gap-4 border-b border-divider">
        {tabs.map((tab) => (
          <RippleButton
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={`pb-3 font-mono font-medium text-xs uppercase tracking-widest transition-colors ${
              active === tab.id
                ? "border-b-2 border-white text-primaryText"
                : "border-b-2 border-transparent text-secondaryText hover:text-secondaryText"
            }`}
          >
            {tab.label}
          </RippleButton>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
