import { cn } from '@/utils/cn';
import { LEDIndicator } from '@/components/controls';
import { useUIStore } from '@/stores/uiStore';
import type { ModuleInstance, ModuleDefinition, ModuleState } from '@wago/shared';

interface IOCardProps {
  module: ModuleInstance;
  definition?: ModuleDefinition;
  state?: ModuleState;
  selected: boolean;
  onClick: () => void;
  onChannelClick: (channel: number) => void;
}

interface ChannelRowProps {
  channel: number;
  value: number | boolean;
  type: string;
  selected: boolean;
  showNumber: boolean;
  onClick: () => void;
}

function ChannelRow({ channel, value, type, selected, showNumber, onClick }: ChannelRowProps) {
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
        'flex items-center gap-1 px-1 py-0.5 rounded-sm cursor-pointer transition-colors',
        'hover:bg-white/10',
        selected && 'bg-wago-orange/30'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-channel={channel}
    >
      {showNumber && (
        <span className="text-xxs text-gray-500 w-3 text-right font-mono">
          {channel}
        </span>
      )}

      <LEDIndicator
        state={isDigital ? (value as boolean) : true}
        color={isOutput ? 'red' : 'green'}
        size="xs"
      />

      <span
        className="text-xxs font-mono flex-1 text-right text-gray-300 truncate"
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
  onClick,
  onChannelClick,
}: IOCardProps) {
  const { showChannelNumbers, selectedChannel } = useUIStore();

  if (!definition) {
    return (
      <div className="w-24 h-48 bg-gray-800 rounded-sm flex items-center justify-center">
        <span className="text-xxs text-gray-500 text-center px-1">Unknown module</span>
      </div>
    );
  }

  const channels = state?.channels ?? [];
  const moduleType = definition.type;

  // Calculate card height based on channel count
  const cardHeight = Math.max(220, definition.channels * 20 + 60);

  return (
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
              onClick={() => onChannelClick(index)}
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
                onClick={() => onChannelClick(i)}
              />
            ))}
        </div>
      </div>

      {/* Footer - slot position */}
      <div className="bg-gray-600 text-gray-400 text-xxs px-1 py-0.5 text-center rounded-b-sm">
        Slot {module.slotPosition}
      </div>
    </div>
  );
}
