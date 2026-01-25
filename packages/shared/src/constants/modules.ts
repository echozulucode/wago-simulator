import type { ModuleDefinition } from '../types/modules.js';

/**
 * WAGO module catalog - predefined module definitions
 * Colors follow a consistent scheme by module type:
 * - Coupler: Dark gray (#1f2937)
 * - Digital Input: Blue (#2563eb)
 * - Digital Output: Red (#dc2626)
 * - Analog Input: Purple (#9333ea)
 * - Analog Output: Orange (#f59e0b)
 * - RTD Input: Green (#16a34a)
 * - Special: Teal (#14b8a6)
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
    processImageInputSize: 2,
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
    processImageInputSize: 1,
    processImageOutputSize: 0,
    hasStatus: false,
  },
  '750-430': {
    moduleNumber: '750-430',
    name: '8-DI 24VDC 0.2ms',
    type: 'digital-input',
    channels: 8,
    width: 1,
    color: '#2563eb',
    description: '8-Channel Digital Input, 24V DC, 0.2ms filter',
    bitsPerChannel: 1,
    processImageInputSize: 1,
    processImageOutputSize: 0,
    hasStatus: false,
  },
  '753-440': {
    moduleNumber: '753-440',
    name: '4-DI 230VAC',
    type: 'digital-input',
    channels: 4,
    width: 1,
    color: '#2563eb',
    description: '4-Channel Digital Input, 230V AC',
    bitsPerChannel: 1,
    processImageInputSize: 1, // 4 bits + padding
    processImageOutputSize: 0,
    hasStatus: false,
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
    processImageInputSize: 2,
    processImageOutputSize: 2,
    hasStatus: false,
  },
  '750-1515': {
    moduleNumber: '750-1515',
    name: '8-DO 24VDC',
    type: 'digital-output',
    channels: 8,
    width: 1,
    color: '#dc2626',
    description: '8-Channel Digital Output, 24V DC, 0.5A',
    bitsPerChannel: 1,
    processImageInputSize: 1,
    processImageOutputSize: 1,
    hasStatus: false,
  },
  '750-530': {
    moduleNumber: '750-530',
    name: '8-DO 24VDC 2A',
    type: 'digital-output',
    channels: 8,
    width: 1,
    color: '#dc2626',
    description: '8-Channel Digital Output, 24V DC, 2.0A',
    bitsPerChannel: 1,
    processImageInputSize: 1,
    processImageOutputSize: 1,
    hasStatus: false,
  },
  '750-515': {
    moduleNumber: '750-515',
    name: '4-DO Relay',
    type: 'digital-output',
    channels: 4,
    width: 1,
    color: '#dc2626',
    description: '4-Channel Relay Output, AC 250V, 2A',
    bitsPerChannel: 1,
    processImageInputSize: 1,
    processImageOutputSize: 1,
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
    description: '4-Channel Analog Input, 4-20mA, 16-bit',
    bitsPerChannel: 16,
    processImageInputSize: 8,
    processImageOutputSize: 0,
    hasStatus: false,
  },
  '750-454': {
    moduleNumber: '750-454',
    name: '2-AI 4-20mA',
    type: 'analog-input',
    channels: 2,
    width: 1,
    color: '#9333ea',
    description: '2-Channel Analog Input, 4-20mA, Differential',
    bitsPerChannel: 16,
    processImageInputSize: 4,
    processImageOutputSize: 0,
    hasStatus: false,
  },

  // Analog Output Modules
  '750-563': {
    moduleNumber: '750-563',
    name: '2-AO 4-20mA',
    type: 'analog-output',
    channels: 2,
    width: 1,
    color: '#f59e0b',
    description: '2-Channel Analog Output, 4-20mA',
    bitsPerChannel: 16,
    processImageInputSize: 0,
    processImageOutputSize: 4,
    hasStatus: false,
  },
  '750-555': {
    moduleNumber: '750-555',
    name: '4-AO 0-10V',
    type: 'analog-output',
    channels: 4,
    width: 1,
    color: '#f59e0b',
    description: '4-Channel Analog Output, 0-10V',
    bitsPerChannel: 16,
    processImageInputSize: 0,
    processImageOutputSize: 8,
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
    description: '2-Channel RTD Input, Pt100',
    bitsPerChannel: 16,
    processImageInputSize: 4,
    processImageOutputSize: 0,
    hasStatus: false,
  },
  '750-464': {
    moduleNumber: '750-464',
    name: '4-RTD Config',
    type: 'rtd-input',
    channels: 4,
    width: 1,
    color: '#16a34a',
    description: '4-Channel RTD Input, Configurable',
    bitsPerChannel: 16,
    processImageInputSize: 8,
    processImageOutputSize: 0,
    hasStatus: false,
  },

  // Special/Counter Modules
  '750-404': {
    moduleNumber: '750-404',
    name: 'Up/Down Counter',
    type: 'special',
    channels: 1, // Logical channels?
    width: 1,
    color: '#14b8a6',
    description: 'Up/Down Counter, 100kHz, 32-bit',
    bitsPerChannel: 32, // + status/control
    processImageInputSize: 6,
    processImageOutputSize: 6,
    hasStatus: true,
  },
  '750-633': {
    moduleNumber: '750-633',
    name: 'Up/Down Counter',
    type: 'special',
    channels: 1,
    width: 1,
    color: '#14b8a6',
    description: 'Up/Down Counter, 32-bit',
    bitsPerChannel: 32,
    processImageInputSize: 6,
    processImageOutputSize: 6,
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
  // Return all modules except coupler for the catalog
  return Object.values(MODULE_CATALOG).filter(m => m.type !== 'coupler');
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