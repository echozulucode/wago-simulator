import type { ModuleInstance, ModuleState } from './modules.js';

/**
 * Coupler configuration
 */
export interface CouplerConfig {
  moduleNumber: string;
  ipAddress: string;
  modbusPort: number;
  unitId: number;
}

/**
 * Rack configuration (persisted)
 */
export interface RackConfig {
  id: string;
  name: string;
  description?: string;
  coupler: CouplerConfig;
  modules: ModuleInstance[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Rack runtime state
 */
export interface RackState {
  id: string;
  name: string;
  coupler: CouplerConfig;
  modules: ModuleState[];
  simulationState: SimulationState;
  connectionState: ConnectionState;
}

/**
 * Simulation state
 */
export type SimulationState = 'stopped' | 'running' | 'paused';

/**
 * Connection state to the backend
 */
export interface ConnectionState {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  modbusClients: number;
  lastHeartbeat: number;
  error?: string;
}

/**
 * Process image address range for a module
 */
export interface AddressRange {
  inputStart: number;
  inputLength: number;
  outputStart: number;
  outputLength: number;
  coilStart: number;
  coilLength: number;
  discreteInputStart: number;
  discreteInputLength: number;
}

/**
 * Complete process image state
 */
export interface ProcessImageState {
  inputRegisters: number[];
  holdingRegisters: number[];
  discreteInputs: boolean[];
  coils: boolean[];
}
