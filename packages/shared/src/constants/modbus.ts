/**
 * Modbus function codes
 */
export const MODBUS_FUNCTION_CODES = {
  READ_COILS: 0x01,
  READ_DISCRETE_INPUTS: 0x02,
  READ_HOLDING_REGISTERS: 0x03,
  READ_INPUT_REGISTERS: 0x04,
  WRITE_SINGLE_COIL: 0x05,
  WRITE_SINGLE_REGISTER: 0x06,
  WRITE_MULTIPLE_COILS: 0x0f,
  WRITE_MULTIPLE_REGISTERS: 0x10,
} as const;

/**
 * Modbus exception codes
 */
export const MODBUS_EXCEPTION_CODES = {
  ILLEGAL_FUNCTION: 0x01,
  ILLEGAL_DATA_ADDRESS: 0x02,
  ILLEGAL_DATA_VALUE: 0x03,
  SERVER_DEVICE_FAILURE: 0x04,
  ACKNOWLEDGE: 0x05,
  SERVER_DEVICE_BUSY: 0x06,
} as const;

/**
 * Default Modbus configuration for WAGO 750-362
 */
export const DEFAULT_MODBUS_CONFIG = {
  port: 502,
  unitId: 1,
  timeout: 5000, // ms
  maxConnections: 5,
  cycleTime: 10, // ms - process image update rate
} as const;

/**
 * WAGO-specific Modbus address offsets
 * Based on WAGO 750-362 documentation
 */
export const WAGO_ADDRESS_OFFSETS = {
  // Coils (digital outputs)
  COIL_OUTPUT_START: 0x0000, // Write outputs
  COIL_OUTPUT_READBACK: 0x0200, // Read output state

  // Discrete Inputs
  DISCRETE_INPUT_START: 0x0000,

  // Input Registers (analog inputs, RTD, etc.)
  INPUT_REGISTER_START: 0x0000,

  // Holding Registers (analog outputs, config)
  HOLDING_REGISTER_START: 0x0000,
  HOLDING_REGISTER_OUTPUT_READBACK: 0x0200,
} as const;

/**
 * Process image limits
 */
export const PROCESS_IMAGE_LIMITS = {
  MAX_DIGITAL_INPUTS: 512, // bits
  MAX_DIGITAL_OUTPUTS: 512, // bits
  MAX_INPUT_REGISTERS: 256, // 16-bit words
  MAX_HOLDING_REGISTERS: 256, // 16-bit words
} as const;

/**
 * Timeout settings for safe state behavior
 */
export const TIMEOUT_CONFIG = {
  // Time after which outputs go to safe state if no communication
  SAFE_STATE_TIMEOUT: 5000, // ms
  // Heartbeat interval for WebSocket keep-alive
  HEARTBEAT_INTERVAL: 1000, // ms
  // Client connection timeout
  CLIENT_TIMEOUT: 10000, // ms
} as const;
