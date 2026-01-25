import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Panel } from '@/components/common';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { MODULE_CATALOG, getMVPModules, MODULE_TYPE_CODES } from '@wago/shared';
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Box,
  GripVertical,
  Plus,
} from 'lucide-react';

interface TreeItemProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  expanded?: boolean;
  onSelect?: () => void;
  onToggle?: () => void;
  hasChildren?: boolean;
  level?: number;
  badge?: string;
  badgeColor?: string;
}

function TreeItem({
  label,
  icon,
  selected,
  expanded,
  onSelect,
  onToggle,
  hasChildren,
  level = 0,
  badge,
  badgeColor,
}: TreeItemProps) {
  return (
    <div
      className={cn(
        'tree-item',
        selected && 'tree-item-selected'
      )}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={onSelect}
    >
      {hasChildren ? (
        <button
          className="p-0.5 -ml-1 hover:bg-panel-active rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}
      {icon && <span className="text-panel-text-muted">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span
          className="px-1 py-0.5 text-xxs rounded font-medium"
          style={{ backgroundColor: badgeColor, color: 'white' }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function RackExplorer() {
  const [expanded, setExpanded] = useState(true);
  const { config, getModulesSorted } = useRackStore();
  const { selectedModuleId, selectModule } = useUIStore();

  const modules = getModulesSorted();

  if (!config) {
    return (
      <div className="p-3 text-sm text-panel-text-muted text-center">
        No rack loaded.
        <br />
        Create a new rack to get started.
      </div>
    );
  }

  return (
    <div className="py-1">
      <TreeItem
        label={config.name}
        icon={<Cpu className="w-4 h-4" />}
        hasChildren={modules.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onSelect={() => selectModule(null)}
      />

      {expanded && (
        <>
          {/* Coupler */}
          <TreeItem
            label={`${config.coupler.moduleNumber} - Coupler`}
            icon={<Box className="w-3.5 h-3.5" />}
            level={1}
            badge="CPU"
            badgeColor={MODULE_CATALOG[config.coupler.moduleNumber]?.color}
          />

          {/* Modules */}
          {modules.map((module) => {
            const def = MODULE_CATALOG[module.moduleNumber];
            return (
              <TreeItem
                key={module.id}
                label={`${module.moduleNumber} - ${def?.name ?? 'Unknown'}`}
                icon={<Box className="w-3.5 h-3.5" />}
                level={1}
                selected={selectedModuleId === module.id}
                onSelect={() => selectModule(module.id)}
                badge={def ? MODULE_TYPE_CODES[def.type] : undefined}
                badgeColor={def?.color}
              />
            );
          })}

          {modules.length === 0 && (
            <div className="py-2 px-4 text-xs text-panel-text-muted italic" style={{ paddingLeft: '32px' }}>
              No modules added
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface DraggableModuleProps {
  moduleNumber: string;
  name: string;
  type: string;
  color: string;
  onAdd: () => void;
}

function DraggableModule({ moduleNumber, name, type: _type, color, onAdd }: DraggableModuleProps) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-panel-hover rounded-sm cursor-grab active:cursor-grabbing group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', moduleNumber);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      data-module={moduleNumber}
    >
      <GripVertical className="w-3 h-3 text-panel-text-muted opacity-0 group-hover:opacity-100" />
      <div
        className="w-1 h-6 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-panel-text">{moduleNumber}</div>
        <div className="text-xxs text-panel-text-muted truncate">{name}</div>
      </div>
      <button
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-panel-active rounded"
        onClick={onAdd}
        title="Add to rack"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

function ModuleCatalog() {
  const { config, addModule, getModulesSorted } = useRackStore();
  const mvpModules = getMVPModules().filter(m => m.type !== 'coupler');

  const handleAddModule = (moduleNumber: string) => {
    if (!config) return;
    const modules = getModulesSorted();
    const nextSlot = modules.length > 0 ? Math.max(...modules.map(m => m.slotPosition)) + 1 : 0;
    addModule(moduleNumber, nextSlot);
  };

  return (
    <div className="py-1 space-y-0.5">
      {mvpModules.map((module) => (
        <DraggableModule
          key={module.moduleNumber}
          moduleNumber={module.moduleNumber}
          name={module.name}
          type={module.type}
          color={module.color}
          onAdd={() => handleAddModule(module.moduleNumber)}
        />
      ))}
    </div>
  );
}

export function LeftPanel() {
  const { leftPanelWidth, setLeftPanelWidth } = useUIStore();
  const [rackExpanded, setRackExpanded] = useState(true);
  const [catalogExpanded, setCatalogExpanded] = useState(true);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setLeftPanelWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="relative flex flex-col bg-panel-bg border-r border-panel-border"
      style={{ width: leftPanelWidth }}
      data-testid="left-panel"
    >
      {/* Rack Explorer */}
      <Panel
        title="Rack Explorer"
        collapsible
        collapsed={!rackExpanded}
        onToggleCollapse={() => setRackExpanded(!rackExpanded)}
        noPadding
        className="border-b border-panel-border"
      >
        <RackExplorer />
      </Panel>

      {/* Module Catalog */}
      <Panel
        title="Module Catalog"
        collapsible
        collapsed={!catalogExpanded}
        onToggleCollapse={() => setCatalogExpanded(!catalogExpanded)}
        noPadding
        className="flex-1"
      >
        <ModuleCatalog />
      </Panel>

      {/* Resize handle */}
      <div
        className="resizer resizer-horizontal right-0 hover:bg-wago-orange/50"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
