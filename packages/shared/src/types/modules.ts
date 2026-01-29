/**
 * Module type categories
 */
export type ModuleType =
  | 'coupler'
  | 'digital-input'
  | 'digital-output'
  | 'analog-input'
  | 'analog-output'
  | 'rtd-input'
  | 'special';

/**
 * Fault types that can be simulated on I/O channels
 */
export type FaultType =
  | 'open-circuit'
  | 'short-circuit'
  | 'over-range'
  | 'under-range'
  | 'sensor-break'
  | null;

/**
 * Module definition from the catalog
 */
export interface ModuleDefinition {
  moduleNumber: string;
  name: string;
  type: ModuleType;
  channels: number;
  width: number; // Rack units (visual width)
  color: string; // Visual identifier color
  description: string;
  bitsPerChannel: number;
  processImageInputSize: number; // Bytes in input process image
  processImageOutputSize: number; // Bytes in output process image
  hasStatus: boolean;
}

/**
 * Identifies who/what set a channel's current value.
 * Precedence (highest to lowest): Force > Manual > Scenario > Default
 */
export type ValueSource =
  | { type: 'default' }
  | { type: 'scenario'; scenarioName: string; behaviorId?: string }
  | { type: 'manual' }
  | { type: 'force' };

/**
 * Channel state for a single I/O point
 */
export interface ChannelState {
  channel: number;
  value: number | boolean;
  rawValue: number;
  fault: FaultType;
  status: number;
  /** Who/what set this value (Default, Scenario, Manual, Force) */
  source: ValueSource;
  /** Is this channel currently forced? */
  forced: boolean;
  /** Is this channel under manual GUI control? */
  manual: boolean;
  /** Which behavior owns this channel (if source is Scenario) */
  scenarioBehaviorId?: string;
  /** Legacy field for backwards compatibility */
  override: boolean;
}

/**
 * Runtime state of a module instance
 */
export interface ModuleState {
  id: string;
  moduleNumber: string;
  slotPosition: number;
  channels: ChannelState[];
  lastUpdate: number;
}

/**
 * Module instance in a rack configuration
 */
export interface ModuleInstance {
  id: string;
  moduleNumber: string;
  slotPosition: number;
  label?: string;
}
