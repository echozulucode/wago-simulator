import { create } from 'zustand';
import type {
  RackConfig,
  ModuleInstance,
  ModuleState,
  SimulationState,
  ConnectionState,
} from '@wago/shared';
import { tauriApi } from '../api/tauri';
import { useConnectionStore } from './connectionStore';

interface RackStore {
  // Configuration (persisted in backend)
  config: RackConfig | null;
  configPath: string | null;

  // Runtime state (synced from backend)
  moduleStates: Map<string, ModuleState>;
  simulationState: SimulationState;
  connectionState: ConnectionState;

  // Actions
  init: () => void;
  createRack: (name: string, description?: string) => Promise<void>;
  loadConfig: (path: string) => Promise<void>;
  clearRack: () => Promise<void>;
  saveConfig: () => Promise<void>;
  saveConfigAs: () => Promise<void>;
  exportConfig: () => Promise<void>;
  addModule: (moduleNumber: string, slotPosition: number) => Promise<void>;
  removeModule: (moduleId: string) => Promise<void>;
  
  setChannelValue: (moduleId: string, channel: number, value: number | boolean) => Promise<void>;
  
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  resetAllIO: () => Promise<void>;
  
  // Selectors
  getModule: (moduleId: string) => ModuleInstance | undefined;
  getModuleState: (moduleId: string) => ModuleState | undefined;
  getModulesSorted: () => ModuleInstance[];
}

export const useRackStore = create<RackStore>((set, get) => ({
  config: null,
  configPath: null,
  moduleStates: new Map(),
  simulationState: 'stopped',
  connectionState: {
    modbusClients: [],
    lastActivity: 0,
  },

  init: () => {
    // Start sync loop
    console.log("Initializing RackStore sync...");
    setInterval(async () => {
      try {
        const { config, moduleStates, simulationState, connectionState } =
          await tauriApi.getRackState();
        
        // Convert array to map
        const stateMap = new Map<string, ModuleState>();
        moduleStates.forEach(s => stateMap.set(s.id, s));
        const hasClients = connectionState.modbusClients.length > 0;
        useConnectionStore.setState({
          wsConnected: hasClients,
          modbusClients: connectionState.modbusClients,
          lastHeartbeat: connectionState.lastActivity,
        });
        set({ 
          config, 
          moduleStates: stateMap,
          simulationState 
        });
      } catch (e) {
        // console.warn("Failed to sync state (backend might be offline)", e);
      }
    }, 100); // 10Hz sync
  },

  createRack: async (name, description) => {
    await tauriApi.createRack(name, description);
    set({ configPath: null });
  },

  loadConfig: async (path) => {
    await tauriApi.loadConfig(path);
    set({ configPath: path });
  },

  clearRack: async () => {
    await tauriApi.clearRack();
    set({
      config: null,
      configPath: null,
      moduleStates: new Map(),
    });
  },

  saveConfig: async () => {
    const { configPath } = get();
    if (configPath) {
      await tauriApi.saveConfig(configPath);
      return;
    }
    await get().saveConfigAs();
  },

  saveConfigAs: async () => {
    const { config } = get();
    const defaultName = config ? `${config.name}.yaml` : undefined;
    const path = await tauriApi.saveConfigDialog(defaultName);
    if (!path) return;
    await tauriApi.saveConfig(path);
    set({ configPath: path });
  },

  exportConfig: async () => {
    const { config } = get();
    const defaultName = config ? `${config.name}-export.yaml` : undefined;
    const path = await tauriApi.saveConfigDialog(defaultName);
    if (!path) return;
    await tauriApi.saveConfig(path);
  },

  addModule: async (moduleNumber, slotPosition) => {
    await tauriApi.addModule(moduleNumber, slotPosition);
  },

  removeModule: async (moduleId) => {
    await tauriApi.removeModule(moduleId);
  },

  setChannelValue: async (moduleId, channel, value) => {
    await tauriApi.setChannelValue(moduleId, channel, value);
  },

  startSimulation: async () => {
    await tauriApi.startSimulation();
  },

  stopSimulation: async () => {
    await tauriApi.stopSimulation();
  },

  resetAllIO: async () => {
    await tauriApi.resetAllIO();
  },

  // Selectors
  getModule: (moduleId) => {
    const { config } = get();
    return config?.modules.find((m) => m.id === moduleId);
  },

  getModuleState: (moduleId) => {
    return get().moduleStates.get(moduleId);
  },

  getModulesSorted: () => {
    const { config } = get();
    return config?.modules.slice().sort((a, b) => a.slotPosition - b.slotPosition) ?? [];
  },
}));
