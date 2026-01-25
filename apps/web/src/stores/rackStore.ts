import { create } from 'zustand';
import type {
  RackConfig,
  ModuleInstance,
  ModuleState,
  SimulationState,
  ConnectionState,
} from '@wago/shared';
import { tauriApi } from '../api/tauri';

interface RackStore {
  // Configuration (persisted in backend)
  config: RackConfig | null;

  // Runtime state (synced from backend)
  moduleStates: Map<string, ModuleState>;
  simulationState: SimulationState;
  connectionState: ConnectionState;

  // Actions
  init: () => void;
  createRack: (name: string, description?: string) => Promise<void>;
  loadConfig: (path: string) => Promise<void>;
  addModule: (moduleNumber: string, slotPosition: number) => Promise<void>;
  removeModule: (moduleId: string) => Promise<void>;
  
  setChannelValue: (moduleId: string, channel: number, value: number | boolean) => Promise<void>;
  
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  
  // Selectors
  getModule: (moduleId: string) => ModuleInstance | undefined;
  getModuleState: (moduleId: string) => ModuleState | undefined;
  getModulesSorted: () => ModuleInstance[];
}

export const useRackStore = create<RackStore>((set, get) => ({
  config: null,
  moduleStates: new Map(),
  simulationState: 'stopped',
  connectionState: {
    status: 'disconnected',
    modbusClients: 0,
    lastHeartbeat: 0,
  },

  init: () => {
    // Start sync loop
    console.log("Initializing RackStore sync...");
    setInterval(async () => {
      try {
        const { config, moduleStates, simulationState } = await tauriApi.getRackState();
        
        // Convert array to map
        const stateMap = new Map<string, ModuleState>();
        moduleStates.forEach(s => stateMap.set(s.id, s));
        
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
  },

  loadConfig: async (path) => {
    await tauriApi.loadConfig(path);
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
