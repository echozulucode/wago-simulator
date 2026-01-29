import { Panel, PanelSection, Badge } from '@/components/common';
import { LEDIndicator, ToggleSwitch, Slider, NumericInput, ValueDisplay } from '@/components/controls';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { useForceStore } from '@/stores/forceStore';
import { MODULE_CATALOG, MODULE_TYPE_LABELS } from '@wago/shared';
import { formatAddress } from '@/utils/formatting';
import { Zap } from 'lucide-react';
import { ReactiveDebugPanel } from '@/components/debug/ReactiveDebugPanel';

function ModuleProperties() {
  const { selectedModuleId } = useUIStore();
  const { getModule } = useRackStore();

  if (!selectedModuleId) {
    return (
      <div className="p-4 text-sm text-panel-text-muted text-center">
        Select a module to view its properties
      </div>
    );
  }

  const module = getModule(selectedModuleId);
  // const moduleState = getModuleState(selectedModuleId);

  if (!module) {
    return (
      <div className="p-4 text-sm text-panel-text-muted text-center">
        Module not found
      </div>
    );
  }

  const definition = MODULE_CATALOG[module.moduleNumber];

  return (
    <div className="p-3 space-y-4">
      {/* Module header */}
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-12 rounded-full"
          style={{ backgroundColor: definition?.color }}
        />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-panel-text">{module.moduleNumber}</h3>
          <p className="text-xs text-panel-text-muted">{definition?.name}</p>
          <Badge variant="info" className="mt-1">
            {definition ? MODULE_TYPE_LABELS[definition.type] : 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Module info */}
      <PanelSection title="Information">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-panel-text-muted">Slot Position</span>
            <span className="text-panel-text font-mono">{module.slotPosition}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-panel-text-muted">Channels</span>
            <span className="text-panel-text font-mono">{definition?.channels ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-panel-text-muted">Process Image</span>
            <span className="text-panel-text font-mono">
              {definition?.processImageInputSize ?? 0} bytes
            </span>
          </div>
        </div>
      </PanelSection>

      {/* Module description */}
      {definition?.description && (
        <PanelSection title="Description">
          <p className="text-xs text-panel-text-muted leading-relaxed">
            {definition.description}
          </p>
        </PanelSection>
      )}
    </div>
  );
}

function ChannelOverride() {
  const { selectedModuleId, selectedChannel } = useUIStore();
  const { getModule, getModuleState, setChannelValue, config } = useRackStore();
  const { isForced, getForcedValue, setForce, clearForce } = useForceStore();

  if (selectedModuleId === null || selectedChannel === null) {
    return null;
  }

  const module = getModule(selectedModuleId);
  const moduleState = getModuleState(selectedModuleId);
  const definition = module ? MODULE_CATALOG[module.moduleNumber] : null;

  if (!module || !moduleState || !definition) {
    return null;
  }

  const channelState = moduleState.channels[selectedChannel];
  if (!channelState) {
    return null;
  }

  // Get module position for force operations
  const modulePosition = config?.modules.findIndex(m => m.id === selectedModuleId) ?? -1;
  const channelIsForced = modulePosition >= 0 && isForced(modulePosition, selectedChannel);
  const forcedValue = modulePosition >= 0 ? getForcedValue(modulePosition, selectedChannel) : undefined;

  const handleValueChange = (value: number | boolean) => {
    setChannelValue(selectedModuleId, selectedChannel, value);
  };

  const handleForceToggle = (enabled: boolean) => {
    if (modulePosition < 0) return;

    if (enabled) {
      // When enabling force, use current value
      const currentValue = typeof channelState.value === 'boolean'
        ? (channelState.value ? 1 : 0)
        : (channelState.value as number);
      setForce(modulePosition, selectedChannel, currentValue);
    } else {
      clearForce(modulePosition, selectedChannel);
    }
  };

  const handleForceValueChange = (value: number | boolean) => {
    if (modulePosition < 0) return;
    const numericValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    setForce(modulePosition, selectedChannel, numericValue);
  };

  const isDigital = definition.type === 'digital-input' || definition.type === 'digital-output';

  return (
    <div className="border-t border-panel-border p-3 space-y-3">
      <h4 className="text-xs font-medium text-panel-text-muted uppercase tracking-wide flex items-center gap-2">
        Channel {selectedChannel} Override
        {channelIsForced && (
          <span className="flex items-center gap-1 text-wago-orange">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] font-bold">FORCED</span>
          </span>
        )}
      </h4>

      {/* Force Controls Section */}
      {modulePosition >= 0 && (
        <div className={`space-y-2 p-2 rounded ${channelIsForced ? 'bg-wago-orange/10 border border-wago-orange/30' : 'bg-panel-bg-hover'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-panel-text flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Force Enable
            </span>
            <ToggleSwitch
              value={channelIsForced}
              onChange={handleForceToggle}
              labels={{ on: 'ON', off: 'OFF' }}
              size="sm"
            />
          </div>

          {/* Force value control for digital channels */}
          {channelIsForced && isDigital && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-panel-text">Force Value</span>
              <ToggleSwitch
                value={forcedValue !== undefined ? forcedValue > 0.5 : false}
                onChange={(v) => handleForceValueChange(v ? 1 : 0)}
                labels={{ on: 'HIGH', off: 'LOW' }}
                size="sm"
              />
            </div>
          )}

          {/* Force value control for analog channels */}
          {channelIsForced && !isDigital && (
            <div className="pt-1 space-y-2">
              <span className="text-xs text-panel-text-muted">Force Value</span>
              <NumericInput
                value={forcedValue ?? 0}
                onChange={handleForceValueChange}
                min={definition.type === 'rtd-input' ? -200 : 0}
                max={definition.type === 'rtd-input' ? 850 : 24}
                step={0.01}
                suffix={definition.type === 'rtd-input' ? '°C' : 'mA'}
              />
            </div>
          )}
        </div>
      )}

      {/* Digital Input */}
      {definition.type === 'digital-input' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-panel-text">State</span>
            <ToggleSwitch
              value={channelState.value as boolean}
              onChange={handleValueChange}
              labels={{ on: 'HIGH', off: 'LOW' }}
              disabled={channelIsForced}
            />
          </div>
          <div className="flex items-center gap-2">
            <LEDIndicator state={channelState.value as boolean} color="green" size="md" />
            <span className="text-sm text-panel-text">
              {channelState.value ? 'Active (24V)' : 'Inactive (0V)'}
            </span>
          </div>
        </div>
      )}

      {/* Digital Output */}
      {definition.type === 'digital-output' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LEDIndicator state={channelState.value as boolean} color="red" size="md" />
            <span className="text-sm text-panel-text">
              {channelState.value ? 'Active' : 'Inactive'}
            </span>
          </div>
          {!channelIsForced && (
            <p className="text-xs text-panel-text-muted">
              Output values are controlled by the connected client
            </p>
          )}
          {channelIsForced && (
            <p className="text-xs text-wago-orange">
              Output is forced - client writes are ignored
            </p>
          )}
        </div>
      )}

      {/* Analog Input */}
      {definition.type === 'analog-input' && (
        <div className="space-y-3">
          <Slider
            value={channelState.value as number}
            onChange={handleValueChange}
            min={0}
            max={24}
            step={0.01}
            formatValue={(v) => `${v.toFixed(2)} mA`}
            disabled={channelIsForced}
          />
          <NumericInput
            value={channelState.value as number}
            onChange={handleValueChange}
            min={0}
            max={24}
            step={0.01}
            suffix="mA"
            disabled={channelIsForced}
          />
          <div className="text-xs text-panel-text-muted">
            Range: 0-24 mA (4-20 mA nominal)
          </div>
        </div>
      )}

      {/* RTD Input */}
      {definition.type === 'rtd-input' && (
        <div className="space-y-3">
          <Slider
            value={channelState.value as number}
            onChange={handleValueChange}
            min={-200}
            max={850}
            step={0.1}
            formatValue={(v) => `${v.toFixed(1)} °C`}
            disabled={channelIsForced}
          />
          <NumericInput
            value={channelState.value as number}
            onChange={handleValueChange}
            min={-200}
            max={850}
            step={0.1}
            suffix="°C"
            disabled={channelIsForced}
          />
          <div className="text-xs text-panel-text-muted">
            Pt100 range: -200 to +850 °C
          </div>
        </div>
      )}

      {/* Raw value display */}
      <div className="pt-2 border-t border-panel-border">
        <ValueDisplay
          label="Raw"
          value={formatAddress(channelState.rawValue)}
          variant="muted"
        />
      </div>
    </div>
  );
}

export function RightPanel() {
  const { rightPanelWidth, setRightPanelWidth, selectedChannel } = useUIStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      setRightPanelWidth(startWidth + delta);
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
      className="relative flex flex-col bg-panel-bg border-l border-panel-border"
      style={{ width: rightPanelWidth }}
      data-testid="right-panel"
    >
      {/* Resize handle */}
      <div
        className="resizer resizer-horizontal left-0 hover:bg-wago-orange/50"
        onMouseDown={handleMouseDown}
      />

      {/* Properties panel */}
      <Panel title="Properties" noPadding className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <ModuleProperties />
          {selectedChannel !== null && <ChannelOverride />}
        </div>
        {/* Reactive Debug Panel */}
        <ReactiveDebugPanel />
      </Panel>
    </div>
  );
}
