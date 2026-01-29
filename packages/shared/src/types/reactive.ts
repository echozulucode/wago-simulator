/**
 * Reactive Scenario System Types
 *
 * These types support the YAML-driven reactive scenario system that defines
 * continuous I/O relationships with ownership tracking.
 */

/**
 * Reference to a specific channel on a module
 */
export interface ChannelRef {
  modulePosition: number;
  channel: number;
}

/**
 * Behavior mapping types
 */
export type BehaviorMappingYaml = 'direct' | 'inverted' | 'scaled' | 'constant';

/**
 * A single reactive behavior that continuously maps source to target
 */
export interface ReactiveBehavior {
  /** Unique identifier within the scenario */
  id: string;
  /** Source channel (required for direct/inverted/scaled) */
  source?: ChannelRef;
  /** Target channel (always required) */
  target: ChannelRef;
  /** How to transform source to target */
  mapping: BehaviorMappingYaml;
  /** Delay in milliseconds before applying changes */
  delayMs: number;
  /** Whether this behavior is currently active */
  enabled: boolean;
  /** Constant value (for constant mapping) */
  value?: number;
}

/**
 * A reactive scenario containing multiple behaviors
 */
export interface ReactiveScenario {
  /** Unique name for the scenario */
  name: string;
  /** Scenario type (should be "reactive") */
  type: string;
  /** Human-readable description */
  description?: string;
  /** Whether this is the default scenario to load on startup */
  default: boolean;
  /** The behaviors that define this scenario */
  behaviors: ReactiveBehavior[];
}

/**
 * Summary info about a reactive scenario (from list command)
 */
export interface ReactiveScenarioInfo {
  name: string;
  description?: string;
  isDefault: boolean;
  behaviorCount: number;
}

/**
 * Active scenario info
 */
export interface ActiveReactiveScenario {
  name: string;
  description?: string;
  behaviorCount: number;
}

/**
 * Validation severity level
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * A validation error or warning
 */
export interface ValidationError {
  /** Which scenario has the issue */
  scenario: string;
  /** Which behavior (if applicable) */
  behaviorId?: string;
  /** JSON path-like location */
  path: string;
  /** Human-readable error message */
  message: string;
  /** Error or Warning */
  severity: ValidationSeverity;
}

/**
 * Information about a forced channel
 */
export interface ForceInfo {
  modulePosition: number;
  channel: number;
  value: number;
  /** Last Modbus-written value (shadowed while forced) */
  shadowValue?: number;
}

/**
 * Information about a manual override
 */
export interface ManualInfo {
  modulePosition: number;
  channel: number;
  value: number;
}

/**
 * Debug information for a behavior (for introspection API)
 */
export interface BehaviorDebug {
  scenario: string;
  behaviorId: string;
  enabled: boolean;
  sourceModule?: number;
  sourceChannel?: number;
  targetModule: number;
  targetChannel: number;
  mapping: string;
  delayMs: number;
  lastSourceValue?: number;
  pendingUntilTick?: number;
  pendingValue?: number;
  lastAppliedTick?: number;
  /** What's blocking this behavior: "Force", "Manual", or undefined */
  blockedBy?: string;
}
