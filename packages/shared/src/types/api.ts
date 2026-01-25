import type { RackConfig, RackState, SimulationState } from './rack.js';
import type { ModuleDefinition, ModuleState, ChannelState } from './modules.js';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Rack API responses
 */
export interface GetRackResponse {
  config: RackConfig;
  state: RackState;
}

export interface CreateRackRequest {
  name: string;
  description?: string;
  couplerModule?: string;
}

/**
 * Module API responses
 */
export interface GetModuleCatalogResponse {
  modules: ModuleDefinition[];
}

export interface AddModuleRequest {
  moduleNumber: string;
  slotPosition: number;
  label?: string;
}

export interface UpdateModuleRequest {
  slotPosition?: number;
  label?: string;
}

/**
 * I/O API requests/responses
 */
export interface SetChannelValueRequest {
  value: number | boolean;
  override?: boolean;
}

export interface GetIOStateResponse {
  modules: ModuleState[];
}

export interface GetModuleIOResponse {
  state: ModuleState;
}

/**
 * Simulation API
 */
export interface SimulationStatusResponse {
  state: SimulationState;
  cycleTime: number;
  cycleCount: number;
  uptime: number;
}

export interface LoadScenarioRequest {
  scenarioId: string;
}

/**
 * System API
 */
export interface SystemInfoResponse {
  version: string;
  uptime: number;
  platform: string;
  nodeVersion: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  modbus: boolean;
  websocket: boolean;
}

/**
 * WebSocket message types
 */
export type WSMessageType =
  | 'io-update'
  | 'module-added'
  | 'module-removed'
  | 'simulation-state'
  | 'client-connected'
  | 'client-disconnected'
  | 'error'
  | 'heartbeat';

export interface WSMessage {
  type: WSMessageType;
  timestamp: number;
  payload: unknown;
}

export interface WSIOUpdatePayload {
  moduleId: string;
  channels: ChannelState[];
}

export interface WSSimulationStatePayload {
  state: SimulationState;
}

export interface WSClientEventPayload {
  clientId: string;
  address: string;
}
