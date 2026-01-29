import { create } from 'zustand';
import { tauriApi } from '@/api/tauri';
import type { ForceInfo } from '@wago/shared';

interface ForceState {
  // Map of "modulePosition:channel" -> ForceInfo
  forces: Map<string, ForceInfo>;

  // Loading state
  isLoading: boolean;

  // Actions
  fetchForces: () => Promise<void>;
  setForce: (modulePosition: number, channel: number, value: number) => Promise<void>;
  clearForce: (modulePosition: number, channel: number) => Promise<void>;
  clearAllForces: () => Promise<void>;

  // Helpers
  isForced: (modulePosition: number, channel: number) => boolean;
  getForce: (modulePosition: number, channel: number) => ForceInfo | undefined;
  getForcedValue: (modulePosition: number, channel: number) => number | undefined;
}

const makeKey = (modulePosition: number, channel: number) => `${modulePosition}:${channel}`;

export const useForceStore = create<ForceState>((set, get) => ({
  forces: new Map(),
  isLoading: false,

  fetchForces: async () => {
    set({ isLoading: true });
    try {
      const forces = await tauriApi.getForces();
      const forceMap = new Map<string, ForceInfo>();
      for (const force of forces) {
        forceMap.set(makeKey(force.modulePosition, force.channel), force);
      }
      set({ forces: forceMap });
    } catch (error) {
      console.error('Failed to fetch forces:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setForce: async (modulePosition: number, channel: number, value: number) => {
    try {
      await tauriApi.setChannelForce(modulePosition, channel, value);
      // Optimistically update local state
      const forces = new Map(get().forces);
      forces.set(makeKey(modulePosition, channel), {
        modulePosition,
        channel,
        value,
      });
      set({ forces });
    } catch (error) {
      console.error('Failed to set force:', error);
      // Refresh from backend on error
      get().fetchForces();
    }
  },

  clearForce: async (modulePosition: number, channel: number) => {
    try {
      await tauriApi.clearChannelForce(modulePosition, channel);
      // Optimistically update local state
      const forces = new Map(get().forces);
      forces.delete(makeKey(modulePosition, channel));
      set({ forces });
    } catch (error) {
      console.error('Failed to clear force:', error);
      // Refresh from backend on error
      get().fetchForces();
    }
  },

  clearAllForces: async () => {
    try {
      await tauriApi.clearAllForces();
      set({ forces: new Map() });
    } catch (error) {
      console.error('Failed to clear all forces:', error);
      get().fetchForces();
    }
  },

  isForced: (modulePosition: number, channel: number) => {
    return get().forces.has(makeKey(modulePosition, channel));
  },

  getForce: (modulePosition: number, channel: number) => {
    return get().forces.get(makeKey(modulePosition, channel));
  },

  getForcedValue: (modulePosition: number, channel: number) => {
    return get().forces.get(makeKey(modulePosition, channel))?.value;
  },
}));
