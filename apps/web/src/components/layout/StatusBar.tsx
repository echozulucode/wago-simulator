import { cn } from '@/utils/cn';
import { LEDIndicator } from '@/components/controls';
import { useRackStore } from '@/stores/rackStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { Wifi, WifiOff, Server, Clock, Users } from 'lucide-react';

export function StatusBar() {
  const { config, simulationState } = useRackStore();
  const { wsConnected, modbusClients, serverVersion } = useConnectionStore();

  const simulationStateLabel = {
    stopped: 'Stopped',
    running: 'Running',
    paused: 'Paused',
  };

  const simulationStateColor = {
    stopped: 'text-panel-text-muted',
    running: 'text-status-success',
    paused: 'text-status-warning',
  };

  return (
    <div
      className="flex items-center h-statusbar px-3 bg-panel-bg-secondary border-t border-panel-border text-xs select-none"
      data-testid="status-bar"
    >
      {/* Connection status */}
      <div
        className="flex items-center gap-1.5 pr-3 border-r border-panel-border"
        data-testid="connection-status"
      >
        {wsConnected ? (
          <>
            <LEDIndicator state={true} color="green" size="xs" />
            <Wifi className="w-3 h-3 text-status-success" />
            <span className="text-panel-text">Clients Active</span>
          </>
        ) : simulationState === 'running' ? (
          <>
            <LEDIndicator state={true} color="yellow" size="xs" />
            <Wifi className="w-3 h-3 text-status-warning" />
            <span className="text-panel-text-muted">Listening</span>
          </>
        ) : (
          <>
            <LEDIndicator state={false} color="red" size="xs" />
            <WifiOff className="w-3 h-3 text-panel-text-muted" />
            <span className="text-panel-text-muted">Server Offline</span>
          </>
        )}
      </div>

      {/* Modbus status */}
      <div className="flex items-center gap-1.5 px-3 border-r border-panel-border">
        <Server className="w-3 h-3 text-panel-text-muted" />
        <span className="text-panel-text-muted">Modbus:</span>
        <span className="text-panel-text font-mono">{config?.coupler.modbusPort ?? 502}</span>
      </div>

      {/* Client count */}
      <div className="flex items-center gap-1.5 px-3 border-r border-panel-border">
        <Users className="w-3 h-3 text-panel-text-muted" />
        <span className="text-panel-text-muted">Clients:</span>
        <span className="text-panel-text font-mono">{modbusClients.length}</span>
      </div>

      {/* Simulation state */}
      <div className="flex items-center gap-1.5 px-3 border-r border-panel-border">
        <LEDIndicator
          state={simulationState === 'running' ? 'blink-slow' : simulationState === 'paused'}
          color={simulationState === 'running' ? 'green' : simulationState === 'paused' ? 'yellow' : 'red'}
          size="xs"
        />
        <span className={cn('font-medium', simulationStateColor[simulationState])}>
          {simulationStateLabel[simulationState]}
        </span>
      </div>

      {/* Cycle time placeholder */}
      <div className="flex items-center gap-1.5 px-3 border-r border-panel-border">
        <Clock className="w-3 h-3 text-panel-text-muted" />
        <span className="text-panel-text-muted">Cycle:</span>
        <span className="text-panel-text font-mono">10ms</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Rack name */}
      {config && (
        <div className="flex items-center gap-1.5 px-3 border-l border-panel-border">
          <span className="text-panel-text">{config.name}</span>
        </div>
      )}

      {/* Version */}
      <div className="flex items-center gap-1.5 pl-3 border-l border-panel-border">
        <span className="text-panel-text-muted">v{serverVersion ?? '1.0.0'}</span>
      </div>
    </div>
  );
}
