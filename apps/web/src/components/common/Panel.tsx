import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  actions?: ReactNode;
  noPadding?: boolean;
}

export function Panel({
  title,
  children,
  className,
  headerClassName,
  bodyClassName,
  collapsible,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  actions,
  noPadding,
}: PanelProps) {
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : defaultCollapsed;

  const handleToggle = () => {
    if (collapsible && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  return (
    <div className={cn('flex flex-col bg-panel-bg', className)}>
      {title && (
        <div
          className={cn(
            'panel-header',
            collapsible && 'cursor-pointer select-none hover:bg-panel-hover',
            headerClassName
          )}
          onClick={handleToggle}
        >
          <div className="flex items-center gap-1.5">
            {collapsible && (
              <span className="text-panel-text-muted">
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </span>
            )}
            <span>{title}</span>
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      {!isCollapsed && (
        <div className={cn('flex-1 overflow-auto', !noPadding && 'p-2', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface PanelSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
}

export function PanelSection({
  title,
  children,
  className,
  defaultCollapsed: _defaultCollapsed = false,
}: PanelSectionProps) {
  return (
    <div className={cn('mb-3 last:mb-0', className)}>
      <h4 className="text-xs font-medium text-panel-text-muted uppercase tracking-wide mb-1.5">
        {title}
      </h4>
      {children}
    </div>
  );
}
