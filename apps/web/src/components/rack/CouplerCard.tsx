import { LEDIndicator } from '@/components/controls';
import { MODULE_CATALOG, type CouplerConfig } from '@wago/shared';
import { useRackStore } from '@/stores/rackStore';
import { useConnectionStore } from '@/stores/connectionStore';

interface CouplerCardProps {
  config: CouplerConfig;
  height?: number;
}

export function CouplerCard({ config, height }: CouplerCardProps) {
  const { simulationState } = useRackStore();
  const { wsConnected, modbusClients } = useConnectionStore();

  const definition = MODULE_CATALOG[config.moduleNumber];

  const isRunning = simulationState === 'running';
  const hasClients = modbusClients.length > 0;

  return (
    <div
      className="relative flex flex-col w-32 bg-gradient-to-b from-gray-800 to-gray-900 rounded-sm shadow-md"
      style={height ? { height } : undefined}
      data-testid="coupler-card"
    >
      {/* Module type stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm"
        style={{ backgroundColor: definition?.color ?? '#1f2937' }}
      />

      {/* Header with module number */}
      <div className="bg-gray-700 text-white text-xxs px-2 py-1 text-center font-mono rounded-t-sm">
        {config.moduleNumber}
      </div>

      {/* Status LEDs area */}
      <div className="flex-1 p-2 space-y-3">
        {/* Power LED */}
        <div className="flex items-center gap-2">
          <LEDIndicator state={true} color="green" size="sm" />
          <span className="text-xxs text-gray-400">PWR</span>
        </div>

        {/* Run LED */}
        <div className="flex items-center gap-2">
          <LEDIndicator
            state={isRunning ? 'blink-slow' : false}
            color="green"
            size="sm"
          />
          <span className="text-xxs text-gray-400">RUN</span>
        </div>

        {/* I/O LED */}
        <div className="flex items-center gap-2">
          <LEDIndicator
            state={isRunning && hasClients}
            color="green"
            size="sm"
          />
          <span className="text-xxs text-gray-400">I/O</span>
        </div>

        {/* Error LED */}
        <div className="flex items-center gap-2">
          <LEDIndicator state={false} color="red" size="sm" />
          <span className="text-xxs text-gray-400">ERR</span>
        </div>

        {/* Ethernet LEDs */}
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <LEDIndicator state={wsConnected} color="green" size="xs" />
            <LEDIndicator
              state={hasClients ? 'blink' : false}
              color="yellow"
              size="xs"
            />
            <span className="text-xxs text-gray-400">ETH</span>
          </div>
        </div>

        {/* IP Address display */}
        <div className="bg-gray-950 rounded px-1 py-0.5">
          <span className="text-xxs font-mono text-green-400">
            {config.ipAddress}
          </span>
        </div>
      </div>

      {/* Footer with port */}
      <div className="bg-gray-800 text-gray-400 text-xxs px-2 py-1 text-center rounded-b-sm">
        Port {config.modbusPort}
      </div>
    </div>
  );
}
