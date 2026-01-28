import { create } from 'zustand';
import type { ModbusClientInfo } from '@wago/shared';

export type { ModbusClientInfo };

export interface ConnectionStore {
  // WebSocket state
  wsConnected: boolean;
  wsReconnecting: boolean;
  wsError: string | null;
  lastHeartbeat: number;

  // Modbus clients
  modbusClients: ModbusClientInfo[];

  // Server info
  serverVersion: string | null;
  serverUptime: number;

  // Actions
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  setWsError: (error: string | null) => void;
  updateHeartbeat: () => void;

  addModbusClient: (client: ModbusClientInfo) => void;
  removeModbusClient: (clientId: string) => void;
  updateModbusClient: (clientId: string, updates: Partial<ModbusClientInfo>) => void;
  clearModbusClients: () => void;

  setServerInfo: (version: string, uptime: number) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  // Initial state
  wsConnected: false,
  wsReconnecting: false,
  wsError: null,
  lastHeartbeat: 0,

  modbusClients: [],

  serverVersion: null,
  serverUptime: 0,

  // WebSocket actions
  setWsConnected: (connected) =>
    set({ wsConnected: connected, wsError: connected ? null : undefined }),

  setWsReconnecting: (reconnecting) =>
    set({ wsReconnecting: reconnecting }),

  setWsError: (error) =>
    set({ wsError: error }),

  updateHeartbeat: () =>
    set({ lastHeartbeat: Date.now() }),

  // Modbus client actions
  addModbusClient: (client) =>
    set((state) => ({
      modbusClients: [...state.modbusClients, client],
    })),

  removeModbusClient: (clientId) =>
    set((state) => ({
      modbusClients: state.modbusClients.filter((c) => c.id !== clientId),
    })),

  updateModbusClient: (clientId, updates) =>
    set((state) => ({
      modbusClients: state.modbusClients.map((c) =>
        c.id === clientId ? { ...c, ...updates } : c
      ),
    })),

  clearModbusClients: () =>
    set({ modbusClients: [] }),

  // Server info
  setServerInfo: (version, uptime) =>
    set({ serverVersion: version, serverUptime: uptime }),
}));
