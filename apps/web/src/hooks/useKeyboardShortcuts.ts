import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { tauriApi } from '@/api/tauri';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const {
    toggleLeftPanel,
    toggleRightPanel,
    zoomIn,
    zoomOut,
    resetZoom,
    clearSelection,
  } = useUIStore();

  const {
    createRack,
    loadConfig,
    saveConfig,
    saveConfigAs,
    startSimulation,
    stopSimulation,
  } = useRackStore();

  const shortcuts: Shortcut[] = [
    // File operations
    { key: 'n', ctrl: true, action: () => createRack('New Rack'), description: 'New Rack' },
    {
      key: 'o',
      ctrl: true,
      action: async () => {
        const path = await tauriApi.openConfigDialog();
        if (path) {
          loadConfig(path);
        }
      },
      description: 'Open',
    },
    { key: 's', ctrl: true, action: saveConfig, description: 'Save' },
    { key: 's', ctrl: true, shift: true, action: saveConfigAs, description: 'Save As' },

    // View operations
    { key: 'e', ctrl: true, action: toggleLeftPanel, description: 'Toggle Explorer' },
    { key: 'p', ctrl: true, action: toggleRightPanel, description: 'Toggle Properties' },
    { key: '=', ctrl: true, action: zoomIn, description: 'Zoom In' },
    { key: '+', ctrl: true, action: zoomIn, description: 'Zoom In' },
    { key: '-', ctrl: true, action: zoomOut, description: 'Zoom Out' },
    { key: '0', ctrl: true, action: resetZoom, description: 'Reset Zoom' },

    // Simulation
    { key: 'F5', action: startSimulation, description: 'Start Simulation' },
    { key: 'F6', action: () => {}, description: 'Pause Simulation' },
    { key: 'F5', shift: true, action: stopSimulation, description: 'Stop Simulation' },

    // Selection
    { key: 'Escape', action: clearSelection, description: 'Clear Selection' },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}
