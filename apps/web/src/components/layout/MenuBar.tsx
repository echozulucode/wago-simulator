import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { tauriApi } from '@/api/tauri';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  action?: () => void;
  submenu?: MenuItem[];
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
  icon?: ReactNode;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function Menu({ label, items, isOpen, onOpen, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    
    if (item.submenu) {
        // Toggle submenu logic would go here, but for simple hover/click menus:
        // We'll rely on CSS or simple state if we wanted nested menus.
        // For MVP, "Open Recent" showing as a flat list in submenu style is tricky without nested UI code.
        // Let's implement a simple nested render.
    } else if (item.action) {
      item.action();
      onClose();
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        className={cn(
          'px-3 py-1 text-sm text-panel-text hover:bg-menu-hover transition-colors',
          isOpen && 'bg-menu-active'
        )}
        onClick={() => (isOpen ? onClose() : onOpen())}
        onMouseEnter={() => isOpen && onOpen()}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 min-w-[200px] bg-menu-bg border border-menu-border shadow-panel-lg py-1 z-50 animate-fade-in">
          {items.map((item, index) =>
            item.divider ? (
              <div key={index} className="menu-divider" />
            ) : (
              <div key={item.id} className="relative group">
                  <button
                    className={cn(
                      'menu-item w-full text-left flex items-center',
                      item.disabled && 'menu-item-disabled'
                    )}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    onMouseEnter={() => setActiveSubmenu(item.id)}
                  >
                    <span className="w-4 flex items-center justify-center">
                      {item.checked && '✓'}
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-panel-text-muted ml-4">{item.shortcut}</span>
                    )}
                    {item.submenu && <span className="ml-2">▶</span>}
                  </button>
                  
                  {/* Nested Submenu */}
                  {item.submenu && activeSubmenu === item.id && (
                      <div className="absolute left-full top-0 min-w-[200px] bg-menu-bg border border-menu-border shadow-panel-lg py-1 -ml-1">
                          {item.submenu.map((sub, subIdx) => (
                              <button
                                key={sub.id}
                                className={cn(
                                  'menu-item w-full text-left flex items-center',
                                  sub.disabled && 'menu-item-disabled'
                                )}
                                onClick={() => {
                                    if (sub.action) sub.action();
                                    onClose();
                                }}
                              >
                                  <span className="w-4"></span>
                                  <span className="flex-1">{sub.label}</span>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [configFiles, setConfigFiles] = useState<string[]>([]);

  const { leftPanelOpen, rightPanelOpen, statusBarVisible, showChannelNumbers, showRawValues } =
    useUIStore();
  const {
    toggleLeftPanel,
    toggleRightPanel,
    toggleStatusBar,
    toggleShowChannelNumbers,
    toggleShowRawValues,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useUIStore();

  const {
    createRack,
    loadConfig,
    clearRack,
    simulationState,
    startSimulation,
    stopSimulation,
    resetAllIO,
  } = useRackStore();

  useEffect(() => {
      // Load config files
      tauriApi.listConfigs().then(setConfigFiles).catch(console.error);
  }, [openMenu]); // Refresh when menu opens? Or just once.

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: 'File',
      items: [
        { id: 'new', label: 'New Rack', shortcut: 'Ctrl+N', action: () => createRack('New Rack') },
        { id: 'open', label: 'Open...', shortcut: 'Ctrl+O', action: async () => {
            const path = await tauriApi.openConfigDialog();
            if (path) {
              loadConfig(path);
            }
        }},
        {
            id: 'recent',
            label: 'Recent Configs',
            disabled: configFiles.length === 0,
            submenu: configFiles.map(file => ({
                id: `file-${file}`,
                label: file,
                action: () => loadConfig(file)
            }))
        },
        { id: 'div1', label: '', divider: true },
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: () => {}, disabled: true },
        { id: 'saveas', label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => {}, disabled: true },
        { id: 'export', label: 'Export Config...', action: () => {}, disabled: true },
        { id: 'div2', label: '', divider: true },
        { id: 'close', label: 'Close Rack', action: clearRack },
      ],
    },
    {
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', action: () => {}, disabled: true },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', action: () => {}, disabled: true },
        { id: 'div1', label: '', divider: true },
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', action: () => {}, disabled: true },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: () => {}, disabled: true },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', action: () => {}, disabled: true },
        { id: 'delete', label: 'Delete', shortcut: 'Del', action: () => {}, disabled: true },
        { id: 'div2', label: '', divider: true },
        { id: 'selectall', label: 'Select All', shortcut: 'Ctrl+A', action: () => {}, disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        {
          id: 'explorer',
          label: 'Explorer Panel',
          shortcut: 'Ctrl+E',
          action: toggleLeftPanel,
          checked: leftPanelOpen,
        },
        {
          id: 'properties',
          label: 'Properties Panel',
          shortcut: 'Ctrl+P',
          action: toggleRightPanel,
          checked: rightPanelOpen,
        },
        {
          id: 'statusbar',
          label: 'Status Bar',
          action: toggleStatusBar,
          checked: statusBarVisible,
        },
        { id: 'div1', label: '', divider: true },
        {
          id: 'channelnums',
          label: 'Show Channel Numbers',
          action: toggleShowChannelNumbers,
          checked: showChannelNumbers,
        },
        {
          id: 'rawvalues',
          label: 'Show Raw Values',
          action: toggleShowRawValues,
          checked: showRawValues,
        },
        { id: 'div2', label: '', divider: true },
        { id: 'zoomin', label: 'Zoom In', shortcut: 'Ctrl++', action: zoomIn },
        { id: 'zoomout', label: 'Zoom Out', shortcut: 'Ctrl+-', action: zoomOut },
        { id: 'zoomreset', label: 'Reset Zoom', shortcut: 'Ctrl+0', action: resetZoom },
      ],
    },
    {
      label: 'Simulation',
      items: [
        {
          id: 'start',
          label: 'Start',
          shortcut: 'F5',
          action: startSimulation,
          disabled: simulationState === 'running',
        },
        {
          id: 'pause',
          label: 'Pause',
          shortcut: 'F6',
          action: () => {},
          disabled: true, // simulationState !== 'running'
        },
        {
          id: 'stop',
          label: 'Stop',
          shortcut: 'Shift+F5',
          action: stopSimulation,
          disabled: simulationState === 'stopped',
        },
        { id: 'div1', label: '', divider: true },
        { id: 'scenario', label: 'Load Scenario...', action: () => {}, disabled: true },
        { id: 'scenarioedit', label: 'Scenario Editor...', action: () => {}, disabled: true },
        { id: 'div2', label: '', divider: true },
        { id: 'resetio', label: 'Reset All I/O', action: resetAllIO },
      ],
    },
    {
      label: 'Tools',
      items: [
        { id: 'modbusmon', label: 'Modbus Monitor', action: () => {}, disabled: true },
        { id: 'iowatch', label: 'I/O Watch', action: () => {}, disabled: true },
        { id: 'datalog', label: 'Data Logger', action: () => {}, disabled: true },
        { id: 'div1', label: '', divider: true },
        { id: 'settings', label: 'Settings...', shortcut: 'Ctrl+,', action: () => {}, disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [
        { id: 'docs', label: 'Documentation', shortcut: 'F1', action: () => {}, disabled: true },
        { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K', action: () => {}, disabled: true },
        { id: 'div1', label: '', divider: true },
        { id: 'updates', label: 'Check for Updates', action: () => {}, disabled: true },
        { id: 'about', label: 'About WAGO Simulator', action: () => {} },
      ],
    },
  ];

  return (
    <div
      className="flex items-center h-menubar bg-panel-bg-secondary border-b border-panel-border select-none"
      data-testid="menu-bar"
    >
      {menus.map((menu) => (
        <Menu
          key={menu.label}
          label={menu.label}
          items={menu.items}
          isOpen={openMenu === menu.label}
          onOpen={() => setOpenMenu(menu.label)}
          onClose={() => setOpenMenu(null)}
        />
      ))}
    </div>
  );
}