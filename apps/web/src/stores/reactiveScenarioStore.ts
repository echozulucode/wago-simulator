import { create } from 'zustand';
import { tauriApi } from '@/api/tauri';
import type { ReactiveScenarioInfo, ActiveReactiveScenario, ValidationError, BehaviorDebug } from '@wago/shared';

interface ReactiveScenarioState {
  // Available scenarios
  scenarios: ReactiveScenarioInfo[];

  // Currently active scenario
  activeScenario: ActiveReactiveScenario | null;

  // Validation errors from last load
  validationErrors: ValidationError[];

  // Debug state for active behaviors
  debugState: BehaviorDebug[];

  // Loading state
  isLoading: boolean;

  // Actions
  fetchScenarios: () => Promise<void>;
  fetchActiveScenario: () => Promise<void>;
  fetchValidationErrors: () => Promise<void>;
  fetchDebugState: () => Promise<void>;
  loadScenario: (name: string) => Promise<void>;
  disableScenario: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useReactiveScenarioStore = create<ReactiveScenarioState>((set, get) => ({
  scenarios: [],
  activeScenario: null,
  validationErrors: [],
  debugState: [],
  isLoading: false,

  fetchScenarios: async () => {
    try {
      const scenarios = await tauriApi.listReactiveScenarios();
      set({ scenarios });
    } catch (error) {
      console.error('Failed to fetch reactive scenarios:', error);
    }
  },

  fetchActiveScenario: async () => {
    try {
      const activeScenario = await tauriApi.getActiveReactiveScenario();
      set({ activeScenario });
    } catch (error) {
      console.error('Failed to fetch active reactive scenario:', error);
    }
  },

  fetchValidationErrors: async () => {
    try {
      const validationErrors = await tauriApi.getValidationErrors();
      set({ validationErrors });
    } catch (error) {
      console.error('Failed to fetch validation errors:', error);
    }
  },

  fetchDebugState: async () => {
    try {
      const debugState = await tauriApi.getReactiveDebugState();
      set({ debugState });
    } catch (error) {
      console.error('Failed to fetch debug state:', error);
    }
  },

  loadScenario: async (name: string) => {
    set({ isLoading: true });
    try {
      await tauriApi.loadReactiveScenario(name);
      await get().fetchActiveScenario();
      await get().fetchDebugState();
    } catch (error) {
      console.error('Failed to load reactive scenario:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  disableScenario: async () => {
    set({ isLoading: true });
    try {
      await tauriApi.disableReactiveScenario();
      set({ activeScenario: null, debugState: [] });
    } catch (error) {
      console.error('Failed to disable reactive scenario:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchScenarios(),
      get().fetchActiveScenario(),
      get().fetchValidationErrors(),
      get().fetchDebugState(),
    ]);
  },
}));
