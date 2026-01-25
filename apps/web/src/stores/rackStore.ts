import { create } from 'zustand';
import type {
  RackConfig,
  ModuleInstance,
  ModuleState,
  SimulationState,
  ConnectionState,
  CouplerConfig,
} from '@wago/shared';
import { MODULE_CATALOG } from '@wago/shared';

interface RackStore {
  // Configuration (persisted)
  config: RackConfig | null;

  // Runtime state
  moduleStates: Map<string, ModuleState>;
  simulationState: SimulationState;
  connectionState: ConnectionState;

  // Configuration actions
  createRack: (name: string, description?: string) => void;
  loadRack: (config: RackConfig) => void;
  clearRack: () => void;
  updateRackName: (name: string) => void;

  // Module actions
  addModule: (moduleNumber: string, slotPosition: number, label?: string) => void;
  removeModule: (moduleId: string) => void;
  moveModule: (moduleId: string, newSlotPosition: number) => void;
  updateModuleLabel: (moduleId: string, label: string) => void;

  // I/O state actions
  updateModuleState: (moduleId: string, state: Partial<ModuleState>) => void;
  setChannelValue: (moduleId: string, channel: number, value: number | boolean) => void;
  setChannelOverride: (moduleId: string, channel: number, override: boolean) => void;
  resetAllIO: () => void;

  // Simulation actions
  setSimulationState: (state: SimulationState) => void;

  // Connection actions
  setConnectionState: (state: Partial<ConnectionState>) => void;

  // Selectors
  getModule: (moduleId: string) => ModuleInstance | undefined;
  getModuleState: (moduleId: string) => ModuleState | undefined;
  getModulesSorted: () => ModuleInstance[];
}

const DEFAULT_COUPLER: CouplerConfig = {
  moduleNumber: '750-362',
  ipAddress: '192.168.1.100',
  modbusPort: 502,
  unitId: 1,
};

const createDefaultModuleState = (module: ModuleInstance): ModuleState => {
  const definition = MODULE_CATALOG[module.moduleNumber];
  const channels = Array.from({ length: definition?.channels ?? 0 }, (_, i) => ({
    channel: i,
    value: definition?.type.includes('digital') ? false : 0,
    rawValue: 0,
    fault: null,
    status: 0,
    override: false,
  }));

  return {
    id: module.id,
    moduleNumber: module.moduleNumber,
    slotPosition: module.slotPosition,
    channels,
    lastUpdate: Date.now(),
  };
};

let moduleIdCounter = 0;
const generateModuleId = () => `module-${++moduleIdCounter}`;

export const useRackStore = create<RackStore>((set, get) => ({
  // Initial state
  config: null,
  moduleStates: new Map(),
  simulationState: 'stopped',
  connectionState: {
    status: 'disconnected',
    modbusClients: 0,
    lastHeartbeat: 0,
  },

  // Configuration actions
  createRack: (name, description) => {
    const now = new Date().toISOString();
    const config: RackConfig = {
      id: `rack-${Date.now()}`,
      name,
      description,
      coupler: DEFAULT_COUPLER,
      modules: [],
      createdAt: now,
      updatedAt: now,
    };
    set({ config, moduleStates: new Map() });
  },

  loadRack: (config) => {
    const moduleStates = new Map<string, ModuleState>();
    config.modules.forEach((module) => {
      moduleStates.set(module.id, createDefaultModuleState(module));
    });
    set({ config, moduleStates });
  },

  clearRack: () => {
    set({ config: null, moduleStates: new Map() });
  },

  updateRackName: (name) => {
    set((state) => {
      if (!state.config) return state;
      return {
        config: {
          ...state.config,
          name,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // Module actions
  addModule: (moduleNumber, slotPosition, label) => {
    set((state) => {
      if (!state.config) return state;

      const module: ModuleInstance = {
        id: generateModuleId(),
        moduleNumber,
        slotPosition,
        label,
      };

      const newModules = [...state.config.modules, module].sort(
        (a, b) => a.slotPosition - b.slotPosition
      );

      const newModuleStates = new Map(state.moduleStates);
      newModuleStates.set(module.id, createDefaultModuleState(module));

      return {
        config: {
          ...state.config,
          modules: newModules,
          updatedAt: new Date().toISOString(),
        },
        moduleStates: newModuleStates,
      };
    });
  },

  removeModule: (moduleId) => {
    set((state) => {
      if (!state.config) return state;

      const newModules = state.config.modules.filter((m) => m.id !== moduleId);
      const newModuleStates = new Map(state.moduleStates);
      newModuleStates.delete(moduleId);

      return {
        config: {
          ...state.config,
          modules: newModules,
          updatedAt: new Date().toISOString(),
        },
        moduleStates: newModuleStates,
      };
    });
  },

  moveModule: (moduleId, newSlotPosition) => {
    set((state) => {
      if (!state.config) return state;

      const newModules = state.config.modules.map((m) =>
        m.id === moduleId ? { ...m, slotPosition: newSlotPosition } : m
      ).sort((a, b) => a.slotPosition - b.slotPosition);

      return {
        config: {
          ...state.config,
          modules: newModules,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  updateModuleLabel: (moduleId, label) => {
    set((state) => {
      if (!state.config) return state;

      const newModules = state.config.modules.map((m) =>
        m.id === moduleId ? { ...m, label } : m
      );

      return {
        config: {
          ...state.config,
          modules: newModules,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // I/O state actions
  updateModuleState: (moduleId, state) => {
    set((s) => {
      const newModuleStates = new Map(s.moduleStates);
      const current = newModuleStates.get(moduleId);
      if (current) {
        newModuleStates.set(moduleId, {
          ...current,
          ...state,
          lastUpdate: Date.now(),
        });
      }
      return { moduleStates: newModuleStates };
    });
  },

  setChannelValue: (moduleId, channel, value) => {
    set((state) => {
      const newModuleStates = new Map(state.moduleStates);
      const moduleState = newModuleStates.get(moduleId);
      if (moduleState) {
        const newChannels = [...moduleState.channels];
        if (newChannels[channel]) {
          newChannels[channel] = {
            ...newChannels[channel],
            value,
            override: true,
          };
        }
        newModuleStates.set(moduleId, {
          ...moduleState,
          channels: newChannels,
          lastUpdate: Date.now(),
        });
      }
      return { moduleStates: newModuleStates };
    });
  },

  setChannelOverride: (moduleId, channel, override) => {
    set((state) => {
      const newModuleStates = new Map(state.moduleStates);
      const moduleState = newModuleStates.get(moduleId);
      if (moduleState) {
        const newChannels = [...moduleState.channels];
        if (newChannels[channel]) {
          newChannels[channel] = {
            ...newChannels[channel],
            override,
          };
        }
        newModuleStates.set(moduleId, {
          ...moduleState,
          channels: newChannels,
          lastUpdate: Date.now(),
        });
      }
      return { moduleStates: newModuleStates };
    });
  },

  resetAllIO: () => {
    set((state) => {
      const newModuleStates = new Map<string, ModuleState>();
      state.config?.modules.forEach((module) => {
        newModuleStates.set(module.id, createDefaultModuleState(module));
      });
      return { moduleStates: newModuleStates };
    });
  },

  // Simulation actions
  setSimulationState: (simulationState) => {
    set({ simulationState });
  },

  // Connection actions
  setConnectionState: (connectionState) => {
    set((state) => ({
      connectionState: { ...state.connectionState, ...connectionState },
    }));
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
