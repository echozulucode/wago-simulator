import type { ModuleType } from '@wago/shared';

/**
 * Format a channel value for display based on module type
 */
export function formatChannelValue(
  value: number | boolean,
  moduleType: ModuleType
): string {
  switch (moduleType) {
    case 'digital-input':
    case 'digital-output':
      return value ? 'ON' : 'OFF';
    case 'analog-input':
      return `${(value as number).toFixed(2)} mA`;
    case 'rtd-input':
      return `${(value as number).toFixed(1)} °C`;
    case 'analog-output':
      return `${(value as number).toFixed(2)} V`;
    default:
      return String(value);
  }
}

/**
 * Format a raw Modbus register value for display
 */
export function formatRawValue(value: number, format: 'hex' | 'dec' | 'bin' = 'hex'): string {
  switch (format) {
    case 'hex':
      return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
    case 'bin':
      return `0b${value.toString(2).padStart(16, '0')}`;
    case 'dec':
    default:
      return value.toString();
  }
}

/**
 * Format a Modbus address for display
 */
export function formatAddress(address: number): string {
  return `0x${address.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Format bytes as human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format timestamp to locale string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}
