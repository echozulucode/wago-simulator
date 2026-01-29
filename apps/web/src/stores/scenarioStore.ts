import { create } from 'zustand';
import { tauriApi } from '../api/tauri';

interface ScenarioState {
  active: boolean;
  name: string | null;
  elapsedMs: number;
  isLoading: boolean;
  error: string | null;
  availableScenarios: string[];

  // Actions
  refreshAvailableScenarios: () => Promise<void>;
  loadScenario: (name: string) => Promise<void>;
  playScenario: () => Promise<void>;
  stopScenario: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  active: false,
  name: null,
  elapsedMs: 0,
  isLoading: false,
  error: null,
  availableScenarios: [],

  refreshAvailableScenarios: async () => {
    try {
      const scenarios = await tauriApi.listScenarios();
      set({ availableScenarios: scenarios });
    } catch (e) {
      console.error('Failed to list scenarios:', e);
    }
  },

  loadScenario: async (name: string) => {
    try {
      set({ isLoading: true, error: null });
      await tauriApi.loadScenario(name);
      set({ name, active: false, elapsedMs: 0 });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  playScenario: async () => {
    try {
      await tauriApi.controlScenario('play');
      set({ active: true });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  stopScenario: async () => {
    try {
      await tauriApi.controlScenario('stop');
      set({ active: false, elapsedMs: 0 });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshStatus: async () => {
    try {
      const status = await tauriApi.getScenarioStatus();
      set({
        active: status.active,
        name: status.name,
        elapsedMs: status.elapsedMs,
      });
    } catch (e) {
      console.error('Failed to refresh scenario status:', e);
    }
  },
}));
