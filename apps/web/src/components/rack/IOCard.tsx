import { useState } from 'react';
import { cn } from '@/utils/cn';
import { LEDIndicator } from '@/components/controls';
import { ContextMenu, type ContextMenuItem } from '@/components/common';
import { useUIStore } from '@/stores/uiStore';
import { useForceStore } from '@/stores/forceStore';
import type { ModuleInstance, ModuleDefinition, ModuleState } from '@wago/shared';
import { Zap } from 'lucide-react';

interface IOCardProps {
  module: ModuleInstance;
  definition?: ModuleDefinition;
  state?: ModuleState;
  selected: boolean;
  modulePosition: number;
  height?: number;
  onClick: () => void;
  onChannelClick: (channel: number) => void;
}

interface ChannelRowProps {
  channel: number;
  value: number | boolean;
  type: string;
  selected: boolean;
  showNumber: boolean;
  isForced: boolean;
  modulePosition: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function ChannelRow({ channel, value, type, selected, showNumber, isForced, onClick, onContextMenu }: ChannelRowProps) {
  const isDigital = type.includes('digital');
  const isOutput = type.includes('output');

  const formatValue = () => {
    if (isDigital) {
      return value ? 'ON' : 'OFF';
    }
    if (type === 'rtd-input') {
      return `${(value as number).toFixed(1)}°`;
    }
    if (type === 'analog-input') {
      return `${(value as number).toFixed(1)}`;
    }
    return String(value);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 px-0.5 py-px rounded-sm cursor-pointer transition-colors',
        'hover:bg-white/10',
        selected && 'bg-wago-orange/30',
        isForced && 'bg-wago-orange/20 border-l border-wago-orange'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onContextMenu={onContextMenu}
      data-channel={channel}
    >
      {showNumber && (
        <span className="text-xxs text-gray-500 w-3 text-right font-mono">
          {channel}
        </span>
      )}

      {isForced && (
        <Zap className="w-2 h-2 text-wago-orange flex-shrink-0" />
      )}

      <LEDIndicator
        state={isDigital ? (value as boolean) : true}
        color={isOutput ? 'red' : 'green'}
        size="xs"
      />

      <span
        className={cn(
          'text-xxs font-mono flex-1 text-right truncate',
          isForced ? 'text-wago-orange' : 'text-gray-300'
        )}
        data-testid="channel-value"
      >
        {formatValue()}
      </span>
    </div>
  );
}

export function IOCard({
  module,
  definition,
  state,
  selected,
  modulePosition,
  height,
  onClick,
  onChannelClick,
}: IOCardProps) {
  const { showChannelNumbers, selectedChannel } = useUIStore();
  const { isForced, setForce, clearForce } = useForceStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    channel: number;
  } | null>(null);

  if (!definition) {
    return (
      <div className="w-24 bg-gray-800 rounded-sm flex items-center justify-center" style={{ height: height ?? 240 }}>
        <span className="text-xxs text-gray-500 text-center px-1">Unknown module</span>
      </div>
    );
  }

  const channels = state?.channels ?? [];
  const moduleType = definition.type;
  const isDigital = moduleType.includes('digital');

  // Use provided height or calculate based on channel count
  const cardHeight = height ?? (definition.channels * 20 + 120);

  const handleContextMenu = (e: React.MouseEvent, channel: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, channel });
  };

  const getContextMenuItems = (channel: number): ContextMenuItem[] => {
    const channelIsForced = isForced(modulePosition, channel);

    if (isDigital) {
      return [
        {
          label: 'Force ON',
          onClick: () => setForce(modulePosition, channel, 1),
          disabled: channelIsForced,
        },
        {
          label: 'Force OFF',
          onClick: () => setForce(modulePosition, channel, 0),
          disabled: channelIsForced,
        },
        { label: '', onClick: () => {}, separator: true },
        {
          label: 'Clear Force',
          onClick: () => clearForce(modulePosition, channel),
          disabled: !channelIsForced,
        },
      ];
    } else {
      // Analog channels - just enable/disable force
      return [
        {
          label: channelIsForced ? 'Clear Force' : 'Enable Force',
          onClick: () => {
            if (channelIsForced) {
              clearForce(modulePosition, channel);
            } else {
              // Get current value from state
              const currentValue = channels[channel]?.value as number ?? 0;
              setForce(modulePosition, channel, currentValue);
            }
          },
        },
      ];
    }
  };

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col w-24 bg-gradient-to-b from-gray-200 to-gray-300 rounded-sm shadow-md cursor-pointer transition-all',
          'hover:shadow-lg hover:brightness-105',
          selected && 'ring-2 ring-wago-orange ring-offset-1 ring-offset-gray-700'
        )}
        style={{ height: cardHeight }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        data-testid="module-slot"
        data-slot={module.slotPosition}
      >
        {/* Module type stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm"
          style={{ backgroundColor: definition.color }}
        />

        {/* Header */}
        <div className="bg-gray-700 text-white text-xxs px-1 py-0.5 text-center font-mono rounded-t-sm">
          {module.moduleNumber}
        </div>

        {/* Module type label */}
        <div className="bg-gray-600 text-gray-300 text-xxs px-1 py-0.5 text-center truncate">
          {definition.name}
        </div>

        {/* Channel grid */}
        <div className="flex-1 overflow-hidden p-0.5 bg-gray-800">
          <div className="h-full overflow-y-auto space-y-px">
            {channels.map((ch, index) => (
              <ChannelRow
                key={index}
                channel={index}
                value={ch.value}
                type={moduleType}
                selected={selected && selectedChannel === index}
                showNumber={showChannelNumbers}
                isForced={isForced(modulePosition, index)}
                modulePosition={modulePosition}
                onClick={() => onChannelClick(index)}
                onContextMenu={(e) => handleContextMenu(e, index)}
              />
            ))}

            {/* Placeholder if no state */}
            {channels.length === 0 &&
              Array.from({ length: definition.channels }).map((_, i) => (
                <ChannelRow
                  key={i}
                  channel={i}
                  value={moduleType.includes('digital') ? false : 0}
                  type={moduleType}
                  selected={selected && selectedChannel === i}
                  showNumber={showChannelNumbers}
                  isForced={isForced(modulePosition, i)}
                  modulePosition={modulePosition}
                  onClick={() => onChannelClick(i)}
                  onContextMenu={(e) => handleContextMenu(e, i)}
                />
              ))}
          </div>
        </div>

        {/* Footer - slot position */}
        <div className="bg-gray-600 text-gray-400 text-xxs px-1 py-0.5 text-center rounded-b-sm">
          Slot {module.slotPosition}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.channel)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
