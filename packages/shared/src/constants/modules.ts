import type { ModuleDefinition } from '../types/modules.js';

/**
 * WAGO module catalog - predefined module definitions
 * Colors follow a consistent scheme by module type:
 * - Coupler: Dark gray (#1f2937)
 * - Digital Input: Blue (#2563eb)
 * - Digital Output: Red (#dc2626)
 * - Analog Input: Purple (#9333ea)
 * - RTD Input: Green (#16a34a)
 */
export const MODULE_CATALOG: Record<string, ModuleDefinition> = {
  // Fieldbus Coupler
  '750-362': {
    moduleNumber: '750-362',
    name: 'Modbus TCP Coupler',
    type: 'coupler',
    channels: 0,
    width: 2,
    color: '#1f2937',
    description: '4th Gen Modbus TCP Fieldbus Coupler, 10/100 Mbit Ethernet',
    bitsPerChannel: 0,
    processImageInputSize: 0,
    processImageOutputSize: 0,
    hasStatus: true,
  },

  // Digital Input Modules
  '750-1405': {
    moduleNumber: '750-1405',
    name: '16-DI 24VDC',
    type: 'digital-input',
    channels: 16,
    width: 1,
    color: '#2563eb',
    description: '16-Channel Digital Input, 24V DC, 3ms filter',
    bitsPerChannel: 1,
    processImageInputSize: 2, // 16 bits = 2 bytes
    processImageOutputSize: 0,
    hasStatus: false,
  },

  '750-1415': {
    moduleNumber: '750-1415',
    name: '8-DI 24VDC',
    type: 'digital-input',
    channels: 8,
    width: 1,
    color: '#2563eb',
    description: '8-Channel Digital Input, 24V DC, 3ms filter',
    bitsPerChannel: 1,
    processImageInputSize: 1, // 8 bits = 1 byte
    processImageOutputSize: 0,
    hasStatus: false,
  },

  '750-1425': {
    moduleNumber: '750-1425',
    name: '8-DI 24VDC Diag',
    type: 'digital-input',
    channels: 8,
    width: 1,
    color: '#2563eb',
    description: '8-Channel Digital Input, 24V DC with diagnostics',
    bitsPerChannel: 1,
    processImageInputSize: 2, // 8 bits data + 8 bits status
    processImageOutputSize: 0,
    hasStatus: true,
  },

  // Digital Output Modules
  '750-1504': {
    moduleNumber: '750-1504',
    name: '16-DO 24VDC',
    type: 'digital-output',
    channels: 16,
    width: 1,
    color: '#dc2626',
    description: '16-Channel Digital Output, 24V DC, 0.5A',
    bitsPerChannel: 1,
    processImageInputSize: 2, // Readback
    processImageOutputSize: 2, // 16 bits = 2 bytes
    hasStatus: false,
  },

  '750-1516': {
    moduleNumber: '750-1516',
    name: '8-DO 24VDC',
    type: 'digital-output',
    channels: 8,
    width: 1,
    color: '#dc2626',
    description: '8-Channel Digital Output, 24V DC, 0.5A',
    bitsPerChannel: 1,
    processImageInputSize: 1, // Readback
    processImageOutputSize: 1, // 8 bits = 1 byte
    hasStatus: false,
  },

  // Analog Input Modules
  '750-455': {
    moduleNumber: '750-455',
    name: '4-AI 4-20mA',
    type: 'analog-input',
    channels: 4,
    width: 1,
    color: '#9333ea',
    description: '4-Channel Analog Input, 4-20mA, 16-bit resolution',
    bitsPerChannel: 16,
    processImageInputSize: 8, // 4 x 16-bit values
    processImageOutputSize: 0,
    hasStatus: false,
  },

  '750-459': {
    moduleNumber: '750-459',
    name: '4-AI 0-10V',
    type: 'analog-input',
    channels: 4,
    width: 1,
    color: '#9333ea',
    description: '4-Channel Analog Input, 0-10V DC, 16-bit resolution',
    bitsPerChannel: 16,
    processImageInputSize: 8, // 4 x 16-bit values
    processImageOutputSize: 0,
    hasStatus: false,
  },

  // RTD Input Modules
  '750-461': {
    moduleNumber: '750-461',
    name: '2-RTD Pt100',
    type: 'rtd-input',
    channels: 2,
    width: 1,
    color: '#16a34a',
    description: '2-Channel RTD Input, Pt100/Pt1000, 0.1°C resolution',
    bitsPerChannel: 16,
    processImageInputSize: 6, // 2 x (16-bit value + 8-bit status)
    processImageOutputSize: 0,
    hasStatus: true,
  },

  '750-469': {
    moduleNumber: '750-469',
    name: '2-Thermocouple',
    type: 'rtd-input',
    channels: 2,
    width: 1,
    color: '#16a34a',
    description: '2-Channel Thermocouple Input, Type K/J/N',
    bitsPerChannel: 16,
    processImageInputSize: 6, // 2 x (16-bit value + 8-bit status)
    processImageOutputSize: 0,
    hasStatus: true,
  },
} as const;

/**
 * Get module definition by module number
 */
export function getModuleDefinition(moduleNumber: string): ModuleDefinition | undefined {
  return MODULE_CATALOG[moduleNumber];
}

/**
 * Get all modules of a specific type
 */
export function getModulesByType(type: ModuleDefinition['type']): ModuleDefinition[] {
  return Object.values(MODULE_CATALOG).filter(m => m.type === type);
}

/**
 * Get modules available for MVP (limited set)
 */
export function getMVPModules(): ModuleDefinition[] {
  const mvpModuleNumbers = ['750-362', '750-1405', '750-1504', '750-461', '750-455'];
  return mvpModuleNumbers
    .map(num => MODULE_CATALOG[num])
    .filter((m): m is ModuleDefinition => m !== undefined);
}

/**
 * Module type display names
 */
export const MODULE_TYPE_LABELS: Record<ModuleDefinition['type'], string> = {
  coupler: 'Fieldbus Coupler',
  'digital-input': 'Digital Input',
  'digital-output': 'Digital Output',
  'analog-input': 'Analog Input',
  'analog-output': 'Analog Output',
  'rtd-input': 'Temperature Input',
  special: 'Special Function',
};

/**
 * Module type short codes (for UI badges)
 */
export const MODULE_TYPE_CODES: Record<ModuleDefinition['type'], string> = {
  coupler: 'CPU',
  'digital-input': 'DI',
  'digital-output': 'DO',
  'analog-input': 'AI',
  'analog-output': 'AO',
  'rtd-input': 'RTD',
  special: 'SP',
};
