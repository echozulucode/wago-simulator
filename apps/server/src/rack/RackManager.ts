import { EventEmitter } from 'events';
import type {
  RackConfig,
  ModuleInstance,
  ModuleState,
  SimulationState,
  CouplerConfig,
} from '@wago/shared';
import { MODULE_CATALOG } from '@wago/shared';
import { ModuleFactory } from '../modules/ModuleFactory.js';
import type { BaseModule } from '../modules/BaseModule.js';

const DEFAULT_COUPLER: CouplerConfig = {
  moduleNumber: '750-362',
  ipAddress: '192.168.1.100',
  modbusPort: 502,
  unitId: 1,
};

export class RackManager extends EventEmitter {
  private config: RackConfig | null = null;
  private modules: Map<string, BaseModule> = new Map();
  private simulationState: SimulationState = 'stopped';
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private cycleTime: number = 10; // ms

  constructor() {
    super();
  }

  // Configuration methods
  createRack(name: string, description?: string): RackConfig {
    const now = new Date().toISOString();
    this.config = {
      id: `rack-${Date.now()}`,
      name,
      description,
      coupler: { ...DEFAULT_COUPLER },
      modules: [],
      createdAt: now,
      updatedAt: now,
    };

    this.modules.clear();
    this.emit('rackCreated', this.config);
    return this.config;
  }

  loadRack(config: RackConfig): void {
    this.config = config;
    this.modules.clear();

    // Instantiate modules
    for (const moduleInstance of config.modules) {
      try {
        const module = ModuleFactory.create(moduleInstance.moduleNumber, moduleInstance.id);
        this.modules.set(moduleInstance.id, module);
      } catch (error) {
        console.warn(`Failed to create module ${moduleInstance.moduleNumber}:`, error);
      }
    }

    this.emit('rackLoaded', this.config);
  }

  getConfig(): RackConfig | null {
    return this.config;
  }

  clearRack(): void {
    this.stopSimulation();
    this.config = null;
    this.modules.clear();
    this.emit('rackCleared');
  }

  // Module methods
  addModule(moduleNumber: string, slotPosition: number, label?: string): ModuleInstance | null {
    if (!this.config) return null;

    const definition = MODULE_CATALOG[moduleNumber];
    if (!definition || definition.type === 'coupler') {
      throw new Error(`Invalid module number: ${moduleNumber}`);
    }

    const id = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const moduleInstance: ModuleInstance = {
      id,
      moduleNumber,
      slotPosition,
      label,
    };

    // Create the module simulation instance
    const module = ModuleFactory.create(moduleNumber, id);
    this.modules.set(id, module);

    // Add to config
    this.config.modules.push(moduleInstance);
    this.config.modules.sort((a, b) => a.slotPosition - b.slotPosition);
    this.config.updatedAt = new Date().toISOString();

    this.emit('moduleAdded', moduleInstance);
    return moduleInstance;
  }

  removeModule(moduleId: string): boolean {
    if (!this.config) return false;

    const index = this.config.modules.findIndex((m) => m.id === moduleId);
    if (index === -1) return false;

    const removed = this.config.modules.splice(index, 1)[0];
    this.modules.delete(moduleId);
    this.config.updatedAt = new Date().toISOString();

    this.emit('moduleRemoved', removed);
    return true;
  }

  getModule(moduleId: string): ModuleInstance | undefined {
    return this.config?.modules.find((m) => m.id === moduleId);
  }

  getModules(): ModuleInstance[] {
    return this.config?.modules ?? [];
  }

  // Module state methods
  getModuleState(moduleId: string): ModuleState | null {
    const module = this.modules.get(moduleId);
    const instance = this.getModule(moduleId);
    if (!module || !instance) return null;

    return {
      id: moduleId,
      moduleNumber: instance.moduleNumber,
      slotPosition: instance.slotPosition,
      channels: module.getChannelStates(),
      lastUpdate: Date.now(),
    };
  }

  getAllModuleStates(): ModuleState[] {
    return Array.from(this.modules.entries()).map(([id, module]) => {
      const instance = this.getModule(id);
      return {
        id,
        moduleNumber: instance?.moduleNumber ?? 'unknown',
        slotPosition: instance?.slotPosition ?? -1,
        channels: module.getChannelStates(),
        lastUpdate: Date.now(),
      };
    });
  }

  setChannelValue(moduleId: string, channel: number, value: number | boolean): boolean {
    const module = this.modules.get(moduleId);
    if (!module) return false;

    module.setChannelValue(channel, value);
    this.emit('moduleStateChanged', moduleId, this.getModuleState(moduleId));
    return true;
  }

  // Simulation control
  getSimulationState(): SimulationState {
    return this.simulationState;
  }

  startSimulation(): void {
    if (this.simulationState === 'running') return;

    this.simulationState = 'running';
    this.emit('simulationStateChanged', this.simulationState);

    // Start simulation loop
    this.simulationInterval = setInterval(() => {
      this.simulationCycle();
    }, this.cycleTime);
  }

  pauseSimulation(): void {
    if (this.simulationState !== 'running') return;

    this.simulationState = 'paused';
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit('simulationStateChanged', this.simulationState);
  }

  stopSimulation(): void {
    if (this.simulationState === 'stopped') return;

    this.simulationState = 'stopped';
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit('simulationStateChanged', this.simulationState);
  }

  resetAllIO(): void {
    for (const module of this.modules.values()) {
      module.reset();
    }
    this.emit('ioReset');
  }

  private simulationCycle(): void {
    // This is where scenario scripts would execute
    // For now, just emit updates for any modules that changed
  }

  // Process image access for Modbus server
  getProcessImage(): { inputs: Buffer; outputs: Buffer } {
    const inputBuffers: Buffer[] = [];
    const outputBuffers: Buffer[] = [];

    // Sort modules by slot position
    const sortedModules = this.config?.modules
      .slice()
      .sort((a, b) => a.slotPosition - b.slotPosition) ?? [];

    for (const instance of sortedModules) {
      const module = this.modules.get(instance.id);
      if (module) {
        inputBuffers.push(module.readInputs());
        const outputs = module.readOutputs();
        if (outputs.length > 0) {
          outputBuffers.push(outputs);
        }
      }
    }

    return {
      inputs: Buffer.concat(inputBuffers),
      outputs: Buffer.concat(outputBuffers),
    };
  }

  writeOutputs(offset: number, data: Buffer): void {
    // Map the data back to the correct modules based on offset
    let currentOffset = 0;

    const sortedModules = this.config?.modules
      .slice()
      .sort((a, b) => a.slotPosition - b.slotPosition) ?? [];

    for (const instance of sortedModules) {
      const module = this.modules.get(instance.id);
      const definition = MODULE_CATALOG[instance.moduleNumber];

      if (!module || !definition) continue;

      const outputSize = definition.processImageOutputSize;
      if (outputSize === 0) continue;

      if (offset >= currentOffset && offset < currentOffset + outputSize) {
        const moduleOffset = offset - currentOffset;
        const dataForModule = data.subarray(0, outputSize - moduleOffset);
        module.writeOutputs(dataForModule, moduleOffset);

        // Emit state change
        this.emit('moduleStateChanged', instance.id, this.getModuleState(instance.id));
      }

      currentOffset += outputSize;
    }
  }
}
