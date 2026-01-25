import { Panel, PanelSection, Badge } from '@/components/common';
import { LEDIndicator, ToggleSwitch, Slider, NumericInput, ValueDisplay } from '@/components/controls';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { MODULE_CATALOG, MODULE_TYPE_LABELS } from '@wago/shared';
import { formatAddress } from '@/utils/formatting';

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
  const { getModule, getModuleState, setChannelValue } = useRackStore();

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

  const handleValueChange = (value: number | boolean) => {
    setChannelValue(selectedModuleId, selectedChannel, value);
  };

  return (
    <div className="border-t border-panel-border p-3 space-y-3">
      <h4 className="text-xs font-medium text-panel-text-muted uppercase tracking-wide">
        Channel {selectedChannel} Override
      </h4>

      {/* Digital Input */}
      {definition.type === 'digital-input' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-panel-text">State</span>
            <ToggleSwitch
              value={channelState.value as boolean}
              onChange={handleValueChange}
              labels={{ on: 'HIGH', off: 'LOW' }}
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

      {/* Digital Output (read-only) */}
      {definition.type === 'digital-output' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LEDIndicator state={channelState.value as boolean} color="red" size="md" />
            <span className="text-sm text-panel-text">
              {channelState.value ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-panel-text-muted">
            Output values are controlled by the connected client
          </p>
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
          />
          <NumericInput
            value={channelState.value as number}
            onChange={handleValueChange}
            min={0}
            max={24}
            step={0.01}
            suffix="mA"
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
          />
          <NumericInput
            value={channelState.value as number}
            onChange={handleValueChange}
            min={-200}
            max={850}
            step={0.1}
            suffix="°C"
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
      <Panel title="Properties" noPadding className="flex-1">
        <ModuleProperties />
        {selectedChannel !== null && <ChannelOverride />}
      </Panel>
    </div>
  );
}
