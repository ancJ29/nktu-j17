import { useEffect, useRef, type ReactNode } from 'react';
import './MobileScrollPillTabs.css';

export type MobileScrollPillTab = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  tabs: ReadonlyArray<MobileScrollPillTab>;
  value: string;
  onChange: (value: string) => void;
};

export function MobileScrollPillTabs({ tabs, value, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = itemRefs.current[value];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [value]);

  return (
    <div className="mspt-shell">
      <div className="mspt-scroll" role="tablist" ref={scrollRef}>
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active}
              className="mspt-tab"
              ref={(el) => {
                itemRefs.current[tab.value] = el;
              }}
              onClick={() => onChange(tab.value)}
            >
              {tab.icon && <span className="mspt-icon">{tab.icon}</span>}
              <span className="mspt-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
