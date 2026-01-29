import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { open as tauriOpen, save as tauriSave } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type {
  RackConfig,
  ModuleInstance,
  ModuleState,
  SimulationState,
  ConnectionState,
  ReactiveScenarioInfo,
  ActiveReactiveScenario,
  ForceInfo,
  ManualInfo,
  ValidationError,
  BehaviorDebug,
} from '@wago/shared';
import { mockInvoke } from '../mocks/tauriMock';

// Detect if running in Tauri
const isTauri = !!(window as any).__TAURI_INTERNALS__;

const invoke = isTauri ? tauriInvoke : mockInvoke;

export const tauriApi = {
  getRackState: async (): Promise<{
    config: RackConfig | null;
    moduleStates: ModuleState[];
    simulationState: SimulationState;
    connectionState: ConnectionState;
  }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await invoke('get_rack_state');
    const [config, moduleStates, simulationState, connectionState] = result as [
      RackConfig | null,
      ModuleState[],
      SimulationState,
      ConnectionState,
    ];
    return { config, moduleStates, simulationState, connectionState };
  },

  createRack: async (name: string, description?: string): Promise<RackConfig> => {
    return await invoke('create_rack', { name, description });
  },

  listConfigs: async (): Promise<string[]> => {
    return await invoke('list_configs');
  },

  loadConfig: async (configPath: string): Promise<RackConfig> => {
    return await invoke('load_config', { configPath });
  },

  clearRack: async (): Promise<void> => {
    return await invoke('clear_rack');
  },

  saveConfig: async (path: string): Promise<void> => {
    return await invoke('save_config', { path });
  },

  addModule: async (moduleNumber: string, slotPosition: number): Promise<ModuleInstance> => {
    return await invoke('add_module', { moduleNumber, slotPosition });
  },

  removeModule: async (moduleId: string): Promise<void> => {
    return await invoke('remove_module', { moduleId });
  },
  
  setChannelValue: async (moduleId: string, channel: number, value: number | boolean): Promise<void> => {
    const numericValue = typeof value === 'boolean' ? (value ? 1.0 : 0.0) : value;
    return await invoke('set_channel_value', { moduleId, channel, value: numericValue });
  },

  startSimulation: async (): Promise<void> => {
    return await invoke('start_simulation');
  },

  stopSimulation: async (): Promise<void> => {
    return await invoke('stop_simulation');
  },

  listScenarios: async (): Promise<string[]> => {
    return await invoke('list_scenarios');
  },

  loadScenario: async (name: string): Promise<string> => {
    return await invoke('load_scenario', { name });
  },

  controlScenario: async (command: 'play' | 'stop'): Promise<void> => {
    return await invoke('control_scenario', { command });
  },

  getScenarioStatus: async (): Promise<{
    active: boolean;
    name: string | null;
    elapsedMs: number;
  }> => {
    return await invoke('get_scenario_status');
  },

  resetAllIO: async (): Promise<void> => {
    return await invoke('reset_all_io');
  },

  saveConfigDialog: async (defaultPath?: string): Promise<string | null> => {
    if (!isTauri) {
      console.warn('Save dialog not available outside Tauri');
      return null;
    }
    const selected = await tauriSave({
      defaultPath,
      filters: [{ name: 'YAML Config', extensions: ['yaml', 'yml'] }],
      title: 'Save Rack Configuration',
    });
    return selected as string | null;
  },

  openConfigDialog: async (): Promise<string | null> => {
    if (!isTauri) {
      console.warn('File dialog not available outside Tauri');
      return null;
    }
    const selected = await tauriOpen({
      multiple: false,
      filters: [{ name: 'YAML Config', extensions: ['yaml', 'yml'] }],
      title: 'Open Rack Configuration',
    });
    return selected as string | null;
  },

  closeApp: async (): Promise<void> => {
    if (!isTauri) {
      window.close();
      return;
    }
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close window:', e);
      // Fallback: try to destroy the window
      await getCurrentWindow().destroy();
    }
  },

  // --- Reactive Scenario API ---

  listReactiveScenarios: async (): Promise<ReactiveScenarioInfo[]> => {
    return await invoke('list_reactive_scenarios');
  },

  loadReactiveScenario: async (name: string): Promise<string> => {
    return await invoke('load_reactive_scenario', { name });
  },

  disableReactiveScenario: async (): Promise<void> => {
    return await invoke('disable_reactive_scenario');
  },

  getActiveReactiveScenario: async (): Promise<ActiveReactiveScenario | null> => {
    return await invoke('get_active_reactive_scenario');
  },

  // --- Force Override API ---

  setChannelForce: async (modulePosition: number, channel: number, value: number): Promise<void> => {
    return await invoke('set_channel_force', { modulePosition, channel, value });
  },

  clearChannelForce: async (modulePosition: number, channel: number): Promise<void> => {
    return await invoke('clear_channel_force', { modulePosition, channel });
  },

  clearAllForces: async (): Promise<void> => {
    return await invoke('clear_all_forces');
  },

  getForces: async (): Promise<ForceInfo[]> => {
    return await invoke('get_forces');
  },

  // --- Manual Override API ---

  setManualOverride: async (modulePosition: number, channel: number, value: number): Promise<void> => {
    return await invoke('set_manual_override', { modulePosition, channel, value });
  },

  clearManualOverride: async (modulePosition: number, channel: number): Promise<void> => {
    return await invoke('clear_manual_override', { modulePosition, channel });
  },

  clearAllManualOverrides: async (): Promise<void> => {
    return await invoke('clear_all_manual_overrides');
  },

  getManualOverrides: async (): Promise<ManualInfo[]> => {
    return await invoke('get_manual_overrides');
  },

  // --- Validation API ---

  getValidationErrors: async (): Promise<ValidationError[]> => {
    return await invoke('get_validation_errors');
  },

  // --- Debug Introspection API ---

  getReactiveDebugState: async (): Promise<BehaviorDebug[]> => {
    return await invoke('get_reactive_debug_state');
  },
};
