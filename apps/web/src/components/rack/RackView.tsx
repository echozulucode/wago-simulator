import { useRackStore } from '@/stores/rackStore';
import { useUIStore } from '@/stores/uiStore';
import { CouplerCard } from './CouplerCard';
import { IOCard } from './IOCard';
import { MODULE_CATALOG } from '@wago/shared';

export function RackView() {
  const { config, getModulesSorted, getModuleState } = useRackStore();
  const { selectedModuleId, selectModule, selectChannel } = useUIStore();

  if (!config) {
    return null;
  }

  const modules = getModulesSorted();

  const handleModuleClick = (moduleId: string) => {
    selectModule(moduleId);
  };

  const handleChannelClick = (moduleId: string, channel: number) => {
    selectModule(moduleId);
    selectChannel(channel);
  };

  const handleBackgroundClick = () => {
    selectModule(null);
  };

  return (
    <div
      className="inline-flex flex-col"
      onClick={handleBackgroundClick}
      data-testid="rack-view"
    >
      {/* DIN Rail visual */}
      <div className="relative">
        {/* Top mounting rail */}
        <div className="h-3 bg-gradient-to-b from-gray-400 to-gray-500 rounded-t-sm shadow-inner" />

        {/* Rack modules container */}
        <div className="flex bg-gradient-to-b from-gray-600 to-gray-700 p-1 gap-0.5">
          {/* End plate (left) */}
          <div className="w-4 bg-gradient-to-r from-wago-orange-dark to-wago-orange rounded-l-sm" />

          {/* Coupler */}
          <CouplerCard config={config.coupler} />

          {/* I/O Modules */}
          {modules.map((module) => {
            const definition = MODULE_CATALOG[module.moduleNumber];
            const state = getModuleState(module.id);

            return (
              <IOCard
                key={module.id}
                module={module}
                definition={definition}
                state={state}
                selected={selectedModuleId === module.id}
                onClick={() => handleModuleClick(module.id)}
                onChannelClick={(channel) => handleChannelClick(module.id, channel)}
              />
            );
          })}

          {/* Empty slots placeholder */}
          {modules.length === 0 && (
            <div className="flex items-center justify-center w-32 h-48 border-2 border-dashed border-gray-500 rounded text-gray-400 text-xs text-center px-2">
              Drag modules here
            </div>
          )}

          {/* End plate (right) */}
          <div className="w-4 bg-gradient-to-l from-gray-800 to-gray-700 rounded-r-sm" />
        </div>

        {/* Bottom mounting rail */}
        <div className="h-3 bg-gradient-to-t from-gray-400 to-gray-500 rounded-b-sm shadow-inner" />
      </div>

      {/* Rack label */}
      <div className="mt-2 text-center">
        <span className="text-xs text-panel-text-muted">{config.name}</span>
      </div>
    </div>
  );
}
