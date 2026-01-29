// Mock Tauri invoke for Playwright/Browser environment
import type { RackConfig, ModuleInstance, ModuleState } from '@wago/shared';
import { MODULE_CATALOG } from '@wago/shared';

// Simulated Backend State
let mockConfig: RackConfig | null = null;
let mockModuleStates: ModuleState[] = [];
let mockSimulationState = 'stopped';
let moduleIdCounter = 0;
const mockModbusClients: { id: string; address: string; connectedAt: number; lastActivity: number; requestCount: number }[] = [];

const createDefaultModuleState = (module: ModuleInstance): ModuleState => {
  const definition = MODULE_CATALOG[module.moduleNumber];
  const channels = Array.from({ length: definition?.channels ?? 0 }, (_, i) => ({
    channel: i,
    value: definition?.type.includes('digital') ? false : 0,
    rawValue: 0,
    fault: null,
    status: 0,
    source: { type: 'default' as const },
    forced: false,
    manual: false,
    scenarioBehaviorId: undefined,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockInvoke = async (cmd: string, args: any = {}): Promise<any> => {
  // console.log(`[MockTauri] invoke: ${cmd}`, args);

  switch (cmd) {
    case 'get_rack_state':
      return [
        mockConfig,
        mockModuleStates,
        mockSimulationState,
        { modbusClients: mockModbusClients, lastActivity: Date.now() },
      ];

    case 'create_rack':
      mockConfig = {
        id: `rack-${Date.now()}`,
        name: args.name,
        description: args.description,
        coupler: {
          moduleNumber: '750-362',
          ipAddress: '127.0.0.1',
          modbusPort: 502,
          unitId: 1,
        },
        modules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockModuleStates = [];
      return mockConfig;

    case 'clear_rack':
      mockConfig = null;
      mockModuleStates = [];
      return;

    case 'list_configs':
      return [];

    case 'add_module': {
      if (!mockConfig) throw new Error('No rack');
      const id = `module-${++moduleIdCounter}`;
      const instance: ModuleInstance = {
        id,
        moduleNumber: args.moduleNumber,
        slotPosition: args.slotPosition,
      };
      mockConfig.modules.push(instance);
      mockConfig.modules.sort((a, b) => a.slotPosition - b.slotPosition);
      
      const newState = createDefaultModuleState(instance);
      mockModuleStates.push(newState);
      
      return instance;
    }

    case 'remove_module':
      if (!mockConfig) return;
      mockConfig.modules = mockConfig.modules.filter(m => m.id !== args.moduleId);
      mockModuleStates = mockModuleStates.filter(m => m.id !== args.moduleId);
      return;

    case 'set_channel_value': {
        const modState = mockModuleStates.find(m => m.id === args.moduleId);
        if (modState) {
            const ch = modState.channels.find(c => c.channel === args.channel);
            if (ch) {
                ch.value = args.value;
                ch.override = true;
            }
        }
        return;
    }

    case 'start_simulation':
      mockSimulationState = 'running';
      return;

    case 'stop_simulation':
      mockSimulationState = 'stopped';
      return;

    case 'save_config':
      return;

    case 'list_scenarios':
      return ['Contactor Simulation', 'Pump Failure', 'Network Stress Test'];

    case 'load_scenario':
      return args.name;

    case 'control_scenario':
      return;

    case 'get_scenario_status':
      return {
        active: false,
        name: null,
        elapsedMs: 0,
      };

    // Reactive scenario commands
    case 'list_reactive_scenarios':
      return [
        { name: 'Sunny Day', description: 'Normal operation feedback', isDefault: true, behaviorCount: 2 },
        { name: 'Failure Mode', description: 'Simulates equipment failures', isDefault: false, behaviorCount: 3 },
      ];

    case 'load_reactive_scenario':
      return args.name;

    case 'disable_reactive_scenario':
      return;

    case 'get_active_reactive_scenario':
      return null;

    // Force override commands
    case 'set_channel_force':
    case 'clear_channel_force':
    case 'clear_all_forces':
      return;

    case 'get_forces':
      return [];

    // Manual override commands
    case 'set_manual_override':
    case 'clear_manual_override':
    case 'clear_all_manual_overrides':
      return;

    case 'get_manual_overrides':
      return [];

    // Validation commands
    case 'get_validation_errors':
      return [];

    // Debug introspection commands
    case 'get_reactive_debug_state':
      return [];

    default:
      console.warn(`[MockTauri] Unknown command: ${cmd}`);
      return null;
  }
};
