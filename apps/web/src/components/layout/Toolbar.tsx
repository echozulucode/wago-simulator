import {
  FilePlus,
  FolderOpen,
  Save,
  Play,
  Pause,
  Square,
  Settings,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PlayCircle,
  StopCircle,
  ChevronDown,
} from 'lucide-react';
import { IconButton } from '@/components/common';
import { Tooltip } from '@/components/common';
import { Divider } from '@/components/common';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { tauriApi } from '@/api/tauri';
import { Menu } from '@headlessui/react';

export function Toolbar() {
  const { zoom, zoomIn, zoomOut, resetZoom } = useUIStore();
  const {
    config,
    simulationState,
    startSimulation,
    stopSimulation,
    resetAllIO,
    createRack,
    loadConfig,
    saveConfig,
  } = useRackStore();

  const {
    active: scenarioActive,
    name: scenarioName,
    loadScenario,
    playScenario,
    stopScenario,
    elapsedMs,
    availableScenarios,
  } = useScenarioStore();

  const handleStart = () => startSimulation();
  const handlePause = () => {}; // Pause not implemented in MVP backend yet
  const handleStop = () => stopSimulation();
  const handleOpen = async () => {
    const path = await tauriApi.openConfigDialog();
    if (path) {
      loadConfig(path);
    }
  };

  return (
    <div
      className="flex items-center h-toolbar px-2 gap-1 bg-panel-bg-secondary border-b border-panel-border select-none"
      data-testid="toolbar"
    >
      {/* File operations */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="New Rack (Ctrl+N)">
          <IconButton
            icon={<FilePlus />}
            onClick={() => createRack('New Rack')}
            data-testid="toolbar-new"
          />
        </Tooltip>
        <Tooltip content="Open (Ctrl+O)">
          <IconButton icon={<FolderOpen />} onClick={handleOpen} data-testid="toolbar-open" />
        </Tooltip>
        <Tooltip content="Save (Ctrl+S)">
          <IconButton
            icon={<Save />}
            onClick={saveConfig}
            disabled={!config}
            data-testid="toolbar-save"
          />
        </Tooltip>
      </div>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* Simulation controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Start Simulation (F5)">
          <IconButton
            icon={<Play />}
            onClick={handleStart}
            disabled={!config || simulationState === 'running'}
            className={cn(
              simulationState === 'running' && 'text-status-success'
            )}
            data-testid="toolbar-start"
          />
        </Tooltip>
        <Tooltip content="Pause (F6)">
          <IconButton
            icon={<Pause />}
            onClick={handlePause}
            disabled={simulationState !== 'running'}
            className={cn(
              simulationState === 'paused' && 'text-status-warning'
            )}
            data-testid="toolbar-pause"
          />
        </Tooltip>
        <Tooltip content="Stop (Shift+F5)">
          <IconButton
            icon={<Square />}
            onClick={handleStop}
            disabled={simulationState === 'stopped'}
            data-testid="toolbar-stop"
          />
        </Tooltip>
        <Tooltip content="Reset All I/O">
          <IconButton
            icon={<RotateCcw />}
            onClick={resetAllIO}
            disabled={!config}
            data-testid="toolbar-reset"
          />
        </Tooltip>
      </div>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* Scenario controls */}
      <div className="flex items-center gap-0.5">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button
            className="flex items-center gap-1 px-2 py-1 text-xs text-panel-text hover:bg-panel-hover rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={availableScenarios.length === 0}
          >
            {scenarioName || 'Select Scenario'}
            <ChevronDown size={12} />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right bg-menu-bg border border-menu-border shadow-lg rounded-sm focus:outline-none z-50">
            {availableScenarios.map((name) => (
              <Menu.Item key={name}>
                {({ active }) => (
                  <button
                    className={cn(
                      'block w-full text-left px-4 py-2 text-xs',
                      active ? 'bg-menu-hover text-white' : 'text-panel-text'
                    )}
                    onClick={() => loadScenario(name)}
                  >
                    {name}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Menu>

        <Tooltip content="Start Scenario">
          <IconButton
            icon={<PlayCircle size={18} />}
            onClick={playScenario}
            disabled={!scenarioName || scenarioActive}
            className={cn(scenarioActive && 'text-status-success')}
            data-testid="toolbar-play-scenario"
          />
        </Tooltip>
        <Tooltip content="Stop Scenario">
          <IconButton
            icon={<StopCircle size={18} />}
            onClick={stopScenario}
            disabled={!scenarioActive}
            data-testid="toolbar-stop-scenario"
          />
        </Tooltip>
        {scenarioActive && (
          <div className="flex flex-col ml-1 px-1 border-l border-panel-border leading-none">
             <span className="text-[10px] font-mono text-status-success">
                {Math.floor(elapsedMs / 1000)}s
              </span>
          </div>
        )}
      </div>

      <Divider orientation="vertical" className="h-6 mx-1" />

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Modbus Monitor">
          <IconButton icon={<Activity />} disabled data-testid="toolbar-monitor" />
        </Tooltip>
        <Tooltip content="Settings (Ctrl+,)">
          <IconButton icon={<Settings />} disabled data-testid="toolbar-settings" />
        </Tooltip>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Tooltip content="Zoom Out (Ctrl+-)">
          <IconButton
            icon={<ZoomOut />}
            onClick={zoomOut}
            disabled={zoom <= 25}
            size="sm"
          />
        </Tooltip>

        <button
          onClick={resetZoom}
          className="px-2 py-0.5 text-xs font-mono text-panel-text hover:bg-panel-hover rounded-sm min-w-[48px] text-center"
          title="Reset zoom (Ctrl+0)"
        >
          {zoom}%
        </button>

        <Tooltip content="Zoom In (Ctrl++)">
          <IconButton
            icon={<ZoomIn />}
            onClick={zoomIn}
            disabled={zoom >= 200}
            size="sm"
          />
        </Tooltip>
      </div>
    </div>
  );
}
