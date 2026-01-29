import { useRackStore } from '@/stores/rackStore';
import { useUIStore } from '@/stores/uiStore';
import { CouplerCard } from './CouplerCard';
import { IOCard } from './IOCard';
import { MODULE_CATALOG } from '@wago/shared';

// Calculate card height for a module - exported for use in RackView
export function calculateCardHeight(channelCount: number): number {
  // Each channel row needs ~20px, plus ~120px for header/footer/padding
  return channelCount * 20 + 120;
}

export function RackView() {
  const { config, getModulesSorted, getModuleState } = useRackStore();
  const { selectedModuleId, selectModule, selectChannel } = useUIStore();

  if (!config) {
    return null;
  }

  const modules = getModulesSorted();

  // Calculate the max height across all modules so cards align at bottom
  const maxHeight = modules.reduce((max, module) => {
    const definition = MODULE_CATALOG[module.moduleNumber];
    const height = calculateCardHeight(definition?.channels ?? 0);
    return Math.max(max, height);
  }, 240); // minimum 240px

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
        <div className="flex items-end bg-gradient-to-b from-gray-600 to-gray-700 p-1 gap-0.5">
          {/* End plate (left) */}
          <div className="w-4 bg-gradient-to-r from-wago-orange-dark to-wago-orange rounded-l-sm" style={{ height: maxHeight }} />

          {/* Coupler */}
          <CouplerCard config={config.coupler} height={maxHeight} />

          {/* I/O Modules */}
          {modules.map((module, index) => {
            const definition = MODULE_CATALOG[module.moduleNumber];
            const state = getModuleState(module.id);

            return (
              <IOCard
                key={module.id}
                module={module}
                definition={definition}
                state={state}
                selected={selectedModuleId === module.id}
                modulePosition={index}
                height={maxHeight}
                onClick={() => handleModuleClick(module.id)}
                onChannelClick={(channel) => handleChannelClick(module.id, channel)}
              />
            );
          })}

          {/* Empty slots placeholder */}
          {modules.length === 0 && (
            <div className="flex items-center justify-center w-32 border-2 border-dashed border-gray-500 rounded text-gray-400 text-xs text-center px-2" style={{ height: maxHeight }}>
              Drag modules here
            </div>
          )}

          {/* End plate (right) */}
          <div className="w-4 bg-gradient-to-l from-gray-800 to-gray-700 rounded-r-sm" style={{ height: maxHeight }} />
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
