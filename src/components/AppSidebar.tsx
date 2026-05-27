import { Cloud, Home, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export type AppSectionId = 'home' | 'backend' | 'settings';

type AppSidebarProps = {
  activeSection: AppSectionId;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSectionChange: (section: AppSectionId) => void;
};

type SidebarItem = {
  id: AppSectionId;
  label: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'backend', label: 'Saved work', icon: Cloud },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AppSidebar = ({
  activeSection,
  expanded,
  onExpandedChange,
  onSectionChange,
}: AppSidebarProps) => {
  const labelClassName = expanded
    ? 'max-w-32 opacity-100'
    : 'max-w-0 opacity-0 lg:pointer-events-none';
  const sidebarWidthClassName = expanded ? 'lg:w-60' : 'lg:w-[4.75rem]';
  const justifyClassName = expanded ? 'justify-start' : 'justify-center';
  const buttonGapClassName = expanded ? 'gap-3' : 'gap-0';
  const buttonWidthClassName = expanded ? 'w-full' : 'lg:w-full';
  const containerDirectionClassName = expanded ? 'flex-col' : 'flex-row lg:flex-col';
  const navDirectionClassName = expanded
    ? 'flex-col overflow-visible'
    : 'flex-row overflow-x-auto lg:flex-col lg:overflow-visible';

  return (
    <aside
      className={`sticky top-0 z-30 min-w-0 border-b border-surface-divider bg-surface-panel/95 shadow-sm backdrop-blur transition-[width] lg:h-screen lg:border-b-0 lg:border-r ${sidebarWidthClassName}`}
    >
      <div className={`flex h-full min-w-0 gap-2 p-2 ${containerDirectionClassName}`}>
        <button
          type="button"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-control border border-transparent px-3 py-2 text-sm font-semibold text-ink-base transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2 focus:ring-offset-surface-panel ${buttonGapClassName} ${buttonWidthClassName} ${justifyClassName}`}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={expanded}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? (
            <PanelLeftClose aria-hidden="true" size={19} strokeWidth={2.2} />
          ) : (
            <PanelLeftOpen aria-hidden="true" size={19} strokeWidth={2.2} />
          )}
          <span
            className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] ${labelClassName}`}
            aria-hidden={!expanded}
          >
            Navigation
          </span>
        </button>
        <nav className={`flex min-w-0 flex-1 gap-1 ${navDirectionClassName}`} aria-label="Primary">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`inline-flex min-h-11 shrink-0 items-center rounded-control border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2 focus:ring-offset-surface-panel ${buttonGapClassName} ${buttonWidthClassName} ${justifyClassName} ${
                  isActive
                    ? 'border-brand-border bg-brand-subtle text-brand-strong shadow-sm'
                    : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink-strong'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={2.2} />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] ${labelClassName}`}
                  aria-hidden={!expanded}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
