import { create } from 'zustand';

export interface PanelState {
  leftPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  statusBarVisible: boolean;
}

export interface SelectionState {
  selectedModuleId: string | null;
  selectedChannel: number | null;
}

export interface ViewState {
  zoom: number;
  theme: 'dark' | 'light';
  showChannelNumbers: boolean;
  showRawValues: boolean;
  animateChanges: boolean;
}

export interface DialogState {
  settingsDialogOpen: boolean;
}

export interface DebugPanelState {
  reactiveDebugExpanded: boolean;
}

export interface UIState extends PanelState, SelectionState, ViewState, DialogState, DebugPanelState {
  // Panel actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleStatusBar: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Selection actions
  selectModule: (moduleId: string | null) => void;
  selectChannel: (channel: number | null) => void;
  clearSelection: () => void;

  // View actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleShowChannelNumbers: () => void;
  toggleShowRawValues: () => void;
  toggleAnimateChanges: () => void;

  // Dialog actions
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;

  // Debug panel actions
  toggleReactiveDebug: () => void;
}

const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 500;
const DEFAULT_PANEL_WIDTH = 260;

export const useUIStore = create<UIState>((set) => ({
  // Initial panel state
  leftPanelOpen: true,
  leftPanelWidth: DEFAULT_PANEL_WIDTH,
  rightPanelOpen: true,
  rightPanelWidth: DEFAULT_PANEL_WIDTH,
  statusBarVisible: true,

  // Initial selection state
  selectedModuleId: null,
  selectedChannel: null,

  // Initial view state
  zoom: 100,
  theme: 'dark',
  showChannelNumbers: true,
  showRawValues: false,
  animateChanges: true,

  // Initial dialog state
  settingsDialogOpen: false,

  // Initial debug panel state
  reactiveDebugExpanded: false,

  // Panel actions
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  toggleStatusBar: () =>
    set((state) => ({ statusBarVisible: !state.statusBarVisible })),

  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, width)) }),

  setRightPanelWidth: (width) =>
    set({ rightPanelWidth: Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, width)) }),

  // Selection actions
  selectModule: (moduleId) =>
    set({ selectedModuleId: moduleId, selectedChannel: null }),

  selectChannel: (channel) =>
    set({ selectedChannel: channel }),

  clearSelection: () =>
    set({ selectedModuleId: null, selectedChannel: null }),

  // View actions
  setZoom: (zoom) =>
    set({ zoom: Math.max(25, Math.min(200, zoom)) }),

  zoomIn: () =>
    set((state) => ({ zoom: Math.min(200, state.zoom + 10) })),

  zoomOut: () =>
    set((state) => ({ zoom: Math.max(25, state.zoom - 10) })),

  resetZoom: () =>
    set({ zoom: 100 }),

  toggleShowChannelNumbers: () =>
    set((state) => ({ showChannelNumbers: !state.showChannelNumbers })),

  toggleShowRawValues: () =>
    set((state) => ({ showRawValues: !state.showRawValues })),

  toggleAnimateChanges: () =>
    set((state) => ({ animateChanges: !state.animateChanges })),

  // Dialog actions
  openSettingsDialog: () => set({ settingsDialogOpen: true }),
  closeSettingsDialog: () => set({ settingsDialogOpen: false }),

  // Debug panel actions
  toggleReactiveDebug: () =>
    set((state) => ({ reactiveDebugExpanded: !state.reactiveDebugExpanded })),
}));
