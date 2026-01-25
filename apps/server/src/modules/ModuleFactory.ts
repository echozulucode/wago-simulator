import type { BaseModule } from './BaseModule.js';
import { DigitalInputModule } from './DigitalInputModule.js';
import { DigitalOutputModule } from './DigitalOutputModule.js';
import { AnalogInputModule } from './AnalogInputModule.js';
import { RTDModule } from './RTDModule.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModuleConstructor = new (id: string, moduleNumber: string, ...args: any[]) => BaseModule;

interface ModuleRegistration {
  constructor: ModuleConstructor;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[];
}

export class ModuleFactory {
  private static registry: Map<string, ModuleRegistration> = new Map([
    // Digital Inputs
    ['750-1405', { constructor: DigitalInputModule, args: [16] }],
    ['750-1415', { constructor: DigitalInputModule, args: [8] }],
    ['750-1425', { constructor: DigitalInputModule, args: [8] }],

    // Digital Outputs
    ['750-1504', { constructor: DigitalOutputModule, args: [16] }],
    ['750-1516', { constructor: DigitalOutputModule, args: [8] }],

    // Analog Inputs
    ['750-455', { constructor: AnalogInputModule, args: [4, { minValue: 4, maxValue: 20 }] }],
    ['750-459', { constructor: AnalogInputModule, args: [4, { minValue: 0, maxValue: 10 }] }],

    // RTD Inputs
    ['750-461', { constructor: RTDModule, args: [2] }],
    ['750-469', { constructor: RTDModule, args: [2] }],
  ]);

  static create(moduleNumber: string, id: string): BaseModule {
    const registration = this.registry.get(moduleNumber);
    if (!registration) {
      throw new Error(`Unknown module: ${moduleNumber}`);
    }

    const { constructor: Constructor, args = [] } = registration;
    return new Constructor(id, moduleNumber, ...args);
  }

  static register(moduleNumber: string, registration: ModuleRegistration): void {
    this.registry.set(moduleNumber, registration);
  }

  static isRegistered(moduleNumber: string): boolean {
    return this.registry.has(moduleNumber);
  }

  static getRegisteredModules(): string[] {
    return Array.from(this.registry.keys());
  }
}
