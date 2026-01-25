import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import type { RackConfig, ModuleInstance, ModuleState, SimulationState } from '@wago/shared';
import { mockInvoke } from '../mocks/tauriMock';

// Detect if running in Tauri
const isTauri = !!(window as any).__TAURI_INTERNALS__;

const invoke = isTauri ? tauriInvoke : mockInvoke;

export const tauriApi = {
  getRackState: async (): Promise<{ config: RackConfig | null; moduleStates: ModuleState[]; simulationState: SimulationState }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await invoke('get_rack_state');
    const [config, moduleStates, simulationState] = result as [RackConfig | null, ModuleState[], SimulationState];
    return { config, moduleStates, simulationState };
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
};
