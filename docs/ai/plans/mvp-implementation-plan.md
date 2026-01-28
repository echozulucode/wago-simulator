# WAGO 750 Simulator - MVP Implementation Plan

## Executive Summary

This document outlines a phased approach to building a Minimum Viable Product (MVP) for the WAGO 750 I/O System Simulator. The MVP focuses on a **single rack configuration** with a limited set of I/O modules, a **polished, production-ready UI shell**, and comprehensive testing infrastructure using Playwright and Modbus clients.

## Current Status Snapshot (2026-01-27)

### ✅ Core Functionality Complete
- The primary simulator backend is now **Rust inside Tauri** (`apps/web/src-tauri`), including Modbus TCP and WAGO-specific behaviors.
- The **UI shell and rack visualization** are fully functional; E2E tests are green and manual I/O controls work correctly.
- **Process data image handling** has been validated under real-world conditions with external Modbus clients.
- All **module types** (DI, DO, AI, AO, RTD, Counter) are working correctly with proper register mapping.
- **Native file open** is implemented via Tauri dialog.
- **Real-world testing complete**: Simulator has been validated against actual Modbus clients and is functioning as expected.

### 🔄 Remaining Work for MVP
- Status bar connection/client counts are not wired (AI-ISSUE-2026012503).
- File > Close Rack action doesn't work (AI-ISSUE-2026012504).
- File > Exit menu item is missing (AI-ISSUE-2026012505).
- Save/save-as/export flows are still stubbed.
- Settings dialog is not implemented.
- Drag-and-drop module placement has a known issue (AI-ISSUE-2026012501) - workaround: use '+' button.

### 📋 Deprioritized / Post-MVP
- Drag-and-drop module placement (workaround available via '+' button).
- Scenario system (deferred to post-MVP).
- Module list scrollbar overflow (AI-ISSUE-2026012502).

## Suggested Next Steps (Priority Order)

### Immediate (MVP Blockers) - ✅ ALL COMPLETE
1. ~~**Wire status bar connection/client updates**~~ - Done (AI-ISSUE-2026012503)
2. ~~**Implement `clearRack` end-to-end**~~ - Done (AI-ISSUE-2026012504)
3. ~~**Add File > Exit menu item**~~ - Done (AI-ISSUE-2026012505)

### Short-term (MVP Polish) - ✅ ALL COMPLETE
4. ~~**Implement save/save-as flows**~~ - Already implemented
5. ~~**Add export config flow**~~ - Already implemented
6. ~~**Implement Settings dialog**~~ - Done

### Optional (Nice-to-have)
7. Fix drag-and-drop module placement (if time permits).
8. Add module list scrollbar.

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18+** | Component-based UI framework |
| **TypeScript** | Type safety and developer experience |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **Tauri JS API** | Desktop bridge for native dialogs and backend invokes |
| **Lucide React** | Consistent icon library |
| **Headless UI** | Accessible UI primitives |

### Backend
| Technology | Purpose |
|------------|---------|
| **Tauri (Rust)** | Primary simulator backend and desktop shell |
| **tokio-modbus** | Modbus TCP server implementation |
| **Rust** | Process image, watchdog, and module logic |

### Testing
| Technology | Purpose |
|------------|---------|
| **Playwright** | End-to-end browser testing |
| **Vitest** | Unit and integration tests |
| **pymodbus (scripts)** | Modbus protocol testing from Python |

### DevOps
| Technology | Purpose |
|------------|---------|
| **pnpm** | Fast, disk-efficient package manager |
| **ESLint + Prettier** | Code quality and formatting |
| **Tauri CLI** | Desktop build and packaging workflow |

---

## MVP Scope

### Single Rack Configuration
- **1x Fieldbus Coupler**: 750-362 (Modbus TCP)
- **Limited I/O Modules** (4 cards for MVP):
  - **750-1405**: 16-Channel Digital Input (24V DC)
  - **750-1504**: 16-Channel Digital Output (24V DC)
  - **750-461**: 2-Channel RTD Input (Pt100)
  - **750-455**: 4-Channel Analog Input (4-20mA)
  - Note: The shared catalog already includes additional DI/DO/AO/Counter modules; support should be validated per module.

### MVP Features
1. Visual rack builder with drag-and-drop card placement
2. Real-time I/O state visualization
3. Manual override controls for all I/O points
4. Modbus TCP server (port 502)
5. Tauri desktop shell with native file open
6. Full UI shell (menus, toolbars, panels, status bar)
7. Scenario system (deferred to post-MVP)

---

## Project Structure

```
wago-simulator/
├── apps/
│   ├── web/                      # React frontend (Vite) + Tauri shell
│   │   ├── src/                  # UI components, stores, hooks
│   │   └── src-tauri/            # Rust backend (Modbus server, state, config)
├── packages/
│   └── shared/                   # Shared types and constants
├── tests/
│   └── e2e/                      # Playwright tests
├── scripts/                      # Python Modbus utilities
├── docs/                         # Design notes and Modbus map
└── package.json
```

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Scaffolding
**Goal**: Set up monorepo structure with all tooling configured.

#### Tasks
- [ ] Initialize pnpm workspace with `apps/web`, `apps/web/src-tauri`, `packages/shared`
- [ ] Configure Vite for React + TypeScript
- [ ] Configure Tailwind CSS with custom theme (WAGO orange: `#FF6600`)
- [ ] Set up ESLint and Prettier
- [ ] Create TypeScript path aliases across packages
- [ ] Configure Tauri dev workflow and permissions

#### Deliverables
```typescript
// packages/shared/src/constants/modules.ts
export const MODULE_CATALOG = {
  '750-362': {
    name: 'Modbus TCP Coupler',
    type: 'coupler',
    width: 2,  // rack units
    color: '#1a1a1a',
    description: '4th Gen Modbus TCP Fieldbus Coupler',
  },
  '750-1405': {
    name: '16-DI 24VDC',
    type: 'digital-input',
    channels: 16,
    width: 1,
    color: '#2563eb',
    bitsPerChannel: 1,
    processImageSize: 2,  // bytes
  },
  '750-1504': {
    name: '16-DO 24VDC',
    type: 'digital-output',
    channels: 16,
    width: 1,
    color: '#dc2626',
    bitsPerChannel: 1,
    processImageSize: 2,
  },
  '750-461': {
    name: '2-RTD Pt100',
    type: 'rtd-input',
    channels: 2,
    width: 1,
    color: '#16a34a',
    bitsPerChannel: 16,
    processImageSize: 6,  // 2x16-bit values + status
  },
  '750-455': {
    name: '4-AI 4-20mA',
    type: 'analog-input',
    channels: 4,
    width: 1,
    color: '#9333ea',
    bitsPerChannel: 16,
    processImageSize: 8,
  },
} as const;
```

### 1.2 UI Shell Implementation
**Goal**: Build complete application shell with all navigation elements.

#### Layout Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│ Menu Bar                                                        │
│ [File ▼] [Edit ▼] [View ▼] [Simulation ▼] [Tools ▼] [Help ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ Toolbar                                                         │
│ [🆕][📂][💾] │ [▶️][⏸️][⏹️] │ [🔧][📊] │           [🔍 100%]   │
├────────────┬───────────────────────────────────────┬────────────┤
│ Left Panel │                                       │Right Panel │
│            │                                       │            │
│ ┌────────┐ │         Main Work Area               │ Properties │
│ │Explorer│ │                                       │            │
│ ├────────┤ │    ┌─────────────────────────┐       │ Module:    │
│ │ Rack   │ │    │                         │       │ 750-1405   │
│ │ └─Card │ │    │    Rack Visualization   │       │            │
│ │ └─Card │ │    │                         │       │ Channels:  │
│ │ └─Card │ │    │                         │       │ 16         │
│ ├────────┤ │    └─────────────────────────┘       │            │
│ │Modules │ │                                       │ Address:   │
│ │ └─750..│ │                                       │ 0x0000     │
│ │ └─750..│ │                                       │            │
│ └────────┘ │                                       │            │
│            │                                       │            │
├────────────┴───────────────────────────────────────┴────────────┤
│ Status Bar                                                      │
│ [●] Connected │ Modbus: 502 │ Clients: 1 │ Cycle: 10ms │ v1.0.0│
└─────────────────────────────────────────────────────────────────┘
```

#### Components to Implement

**MenuBar.tsx**
```typescript
interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  submenu?: MenuItem[];
  divider?: boolean;
  disabled?: boolean;
}

const menuStructure: MenuItem[] = [
  {
    label: 'File',
    submenu: [
      { label: 'New Rack', shortcut: 'Ctrl+N', action: newRack },
      { label: 'Open...', shortcut: 'Ctrl+O', action: openRack },
      { label: 'Open Recent', submenu: [...] },
      { divider: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: saveRack },
      { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: saveRackAs },
      { label: 'Export Config...', action: exportConfig },
      { divider: true },
      { label: 'Exit', shortcut: 'Alt+F4', action: exitApp },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: undo },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: redo },
      { divider: true },
      { label: 'Cut', shortcut: 'Ctrl+X', action: cut },
      { label: 'Copy', shortcut: 'Ctrl+C', action: copy },
      { label: 'Paste', shortcut: 'Ctrl+V', action: paste },
      { label: 'Delete', shortcut: 'Del', action: deleteSelected },
      { divider: true },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
    ],
  },
  {
    label: 'View',
    submenu: [
      { label: 'Explorer Panel', shortcut: 'Ctrl+E', action: toggleExplorer },
      { label: 'Properties Panel', shortcut: 'Ctrl+P', action: toggleProperties },
      { label: 'Status Bar', action: toggleStatusBar },
      { divider: true },
      { label: 'Zoom In', shortcut: 'Ctrl++', action: zoomIn },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: zoomOut },
      { label: 'Fit to Window', shortcut: 'Ctrl+0', action: fitToWindow },
      { divider: true },
      { label: 'Full Screen', shortcut: 'F11', action: toggleFullScreen },
    ],
  },
  {
    label: 'Simulation',
    submenu: [
      { label: 'Start', shortcut: 'F5', action: startSimulation },
      { label: 'Pause', shortcut: 'F6', action: pauseSimulation },
      { label: 'Stop', shortcut: 'Shift+F5', action: stopSimulation },
      { divider: true },
      { label: 'Load Scenario...', action: loadScenario },
      { label: 'Scenario Editor...', action: openScenarioEditor },
      { divider: true },
      { label: 'Reset All I/O', action: resetIO },
      { label: 'Force All Outputs Off', action: forceOutputsOff },
    ],
  },
  {
    label: 'Tools',
    submenu: [
      { label: 'Modbus Monitor', action: openModbusMonitor },
      { label: 'I/O Watch', action: openIOWatch },
      { label: 'Data Logger', action: openDataLogger },
      { divider: true },
      { label: 'Settings...', shortcut: 'Ctrl+,', action: openSettings },
    ],
  },
  {
    label: 'Help',
    submenu: [
      { label: 'Documentation', shortcut: 'F1', action: openDocs },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K', action: showShortcuts },
      { divider: true },
      { label: 'Check for Updates', action: checkUpdates },
      { label: 'About WAGO Simulator', action: showAbout },
    ],
  },
];
```

**Toolbar.tsx** - Icon-based quick actions
```typescript
const toolbarGroups = [
  {
    id: 'file',
    items: [
      { icon: FilePlus, tooltip: 'New Rack (Ctrl+N)', action: 'newRack' },
      { icon: FolderOpen, tooltip: 'Open (Ctrl+O)', action: 'openRack' },
      { icon: Save, tooltip: 'Save (Ctrl+S)', action: 'saveRack' },
    ],
  },
  {
    id: 'simulation',
    items: [
      { icon: Play, tooltip: 'Start Simulation (F5)', action: 'start', variant: 'success' },
      { icon: Pause, tooltip: 'Pause (F6)', action: 'pause' },
      { icon: Square, tooltip: 'Stop (Shift+F5)', action: 'stop', variant: 'danger' },
    ],
  },
  {
    id: 'tools',
    items: [
      { icon: Wrench, tooltip: 'Settings (Ctrl+,)', action: 'settings' },
      { icon: Activity, tooltip: 'Modbus Monitor', action: 'modbusMonitor' },
    ],
  },
  {
    id: 'zoom',
    items: [
      { icon: ZoomOut, tooltip: 'Zoom Out (Ctrl+-)', action: 'zoomOut' },
      { component: ZoomSlider },
      { icon: ZoomIn, tooltip: 'Zoom In (Ctrl++)', action: 'zoomIn' },
    ],
  },
];
```

**LeftPanel.tsx** - Explorer tree and module catalog
```typescript
interface LeftPanelProps {
  width: number;
  onResize: (width: number) => void;
}

// Collapsible sections:
// 1. Rack Explorer - tree view of current rack configuration
// 2. Module Catalog - draggable modules to add to rack
// 3. Scenarios - available scenario files
```

**StatusBar.tsx** - Connection status and system info
```typescript
interface StatusBarProps {
  connection: 'connected' | 'disconnected' | 'error';
  modbusPort: number;
  clientCount: number;
  cycleTime: number;
  simulationState: 'running' | 'paused' | 'stopped';
  version: string;
}
```

#### Tailwind Theme Extension
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wago: {
          orange: '#FF6600',
          'orange-dark': '#CC5200',
          'orange-light': '#FF8533',
        },
        panel: {
          bg: '#1e1e1e',
          border: '#333333',
          hover: '#2a2a2a',
          active: '#3a3a3a',
        },
        led: {
          off: '#333333',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#eab308',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      animation: {
        'led-blink': 'led-blink 0.5s ease-in-out infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'led-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
      },
    },
  },
  plugins: [],
};
```

### 1.3 Tauri Backend Foundation
**Goal**: Set up Rust backend with Tauri commands and configuration schema.

#### Tasks
- [ ] Initialize Tauri app in `apps/web/src-tauri`
- [ ] Implement core commands: `get_rack_state`, `create_rack`, `load_config`, `add_module`, `remove_module`, `set_channel_value`, `start_simulation`, `stop_simulation`
- [ ] Wire plugin permissions (dialogs, file system as needed)
- [ ] Define YAML config schema in `sim_config.rs` and validate inputs

---

## Phase 2: Core Simulation Engine (Week 3-4)

**Status (2026-01-27): ✅ COMPLETE** - Core simulation logic is fully implemented and validated in Rust under `apps/web/src-tauri`. Modbus TCP server, watchdog handling, and WAGO-specific register behavior are all working correctly. Real-world testing has confirmed proper operation with external Modbus clients.

### 2.1 Modbus + Process Image (Rust)
- Implemented in `apps/web/src-tauri/src/server.rs`, `state.rs`, and `sim_config.rs`.
- Uses WAGO address mapping documented in `docs/MODBUS_MAP.md`.
- Watchdog and metadata registers are implemented in Rust.

### 2.2 Module Catalog + Rack State
- Module definitions live in `packages/shared/src/constants/modules.ts`.
- Rust module behavior is implemented in `apps/web/src-tauri/src/modules.rs`.
- Rack/config state lives in `apps/web/src-tauri/src/state.rs`.

**Remaining Work**
- Align YAML rack config schema with Tauri (`sim_config.rs`) and the UI.
- Add regression tests for address map and process image packing.
- Validate non-MVP modules (AO/counters) against real WAGO formats.

---

## Phase 3: UI Visualization (Week 5-6)

**Status (2026-01-27): ✅ SUBSTANTIALLY COMPLETE** - UI shell, rack view, module cards, and manual override controls are fully functional. Playwright E2E tests are passing. Real-time I/O visualization works correctly with external Modbus clients.

**Remaining Work**
- Wire status bar connection/client info (tracked: AI-ISSUE-2026012503).
- Add File > Close Rack / File > Exit menu actions (tracked: AI-ISSUE-2026012504, AI-ISSUE-2026012505).
- Enable save/save-as/export in MenuBar/Toolbar.
- *Deprioritized:* Drag-and-drop module placement (workaround available).

### 3.1 Rack Visualization Component
**Goal**: Create photorealistic rack visualization with interactive modules.

#### Visual Design Principles
1. **Realistic Appearance**: Match actual WAGO hardware colors and proportions
2. **Clear State Indication**: LED colors, value displays, channel labels
3. **Intuitive Interaction**: Click to select, double-click to edit, drag to reorder
4. **Responsive**: Smooth zoom, pan, and resize

#### Component Hierarchy
```
RackView
├── RackBackground (DIN rail, end plates)
├── CouplerCard (750-362 with status LEDs)
│   ├── PowerLED
│   ├── RunLED
│   ├── EthernetLED
│   └── DisplayArea (IP address)
└── ModuleSlots
    ├── ModuleSlot[0]
    │   └── IOCard (varies by type)
    │       ├── ModuleHeader (part number, name)
    │       ├── ChannelGrid
    │       │   ├── ChannelCell (LED + label + value)
    │       │   └── ...
    │       └── ModuleFooter (status indicators)
    ├── ModuleSlot[1]
    └── ...
```

#### IOCard Component (Generic)
```typescript
// apps/web/src/components/modules/IOCard.tsx
interface IOCardProps {
  module: Module;
  selected: boolean;
  onSelect: () => void;
  onChannelClick: (channel: number) => void;
}

export function IOCard({ module, selected, onSelect, onChannelClick }: IOCardProps) {
  const moduleConfig = MODULE_CATALOG[module.moduleNumber];

  return (
    <div
      className={cn(
        "relative w-16 bg-gray-200 rounded-sm border-2 transition-all",
        "hover:shadow-lg cursor-pointer",
        selected ? "border-wago-orange ring-2 ring-wago-orange/30" : "border-gray-400"
      )}
      style={{ height: `${moduleConfig.channels * 12 + 40}px` }}
      onClick={onSelect}
    >
      {/* Module header */}
      <div className="bg-gray-700 text-white text-xxs p-1 text-center font-mono">
        {module.moduleNumber}
      </div>

      {/* Channel grid */}
      <div className="p-1 space-y-0.5">
        {Array.from({ length: moduleConfig.channels }).map((_, ch) => (
          <ChannelRow
            key={ch}
            channel={ch}
            value={module.values[ch]}
            type={moduleConfig.type}
            onClick={() => onChannelClick(ch)}
          />
        ))}
      </div>

      {/* Module type indicator stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm"
        style={{ backgroundColor: moduleConfig.color }}
      />
    </div>
  );
}
```

#### Channel Row Component
```typescript
interface ChannelRowProps {
  channel: number;
  value: number | boolean;
  type: 'digital-input' | 'digital-output' | 'analog-input' | 'rtd-input';
  onClick: () => void;
}

export function ChannelRow({ channel, value, type, onClick }: ChannelRowProps) {
  return (
    <div
      className="flex items-center gap-1 h-3 hover:bg-gray-300 rounded px-0.5 cursor-pointer"
      onClick={onClick}
    >
      {/* Channel number */}
      <span className="text-xxs text-gray-500 w-3 text-right font-mono">
        {channel}
      </span>

      {/* LED indicator */}
      <LEDIndicator
        state={type.includes('digital') ? (value as boolean) : true}
        color={type === 'digital-output' ? 'red' : 'green'}
        size="xs"
      />

      {/* Value display */}
      <span className="text-xxs font-mono flex-1 text-right">
        {formatValue(value, type)}
      </span>
    </div>
  );
}

function formatValue(value: number | boolean, type: string): string {
  switch (type) {
    case 'digital-input':
    case 'digital-output':
      return value ? 'ON' : 'OFF';
    case 'analog-input':
      return `${(value as number).toFixed(2)}mA`;
    case 'rtd-input':
      return `${(value as number).toFixed(1)}°C`;
    default:
      return String(value);
  }
}
```

#### LED Indicator Component
```typescript
// apps/web/src/components/controls/LEDIndicator.tsx
interface LEDIndicatorProps {
  state: boolean | 'blink';
  color: 'green' | 'red' | 'yellow' | 'blue';
  size?: 'xs' | 'sm' | 'md';
  label?: string;
}

export function LEDIndicator({ state, color, size = 'sm', label }: LEDIndicatorProps) {
  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  const colorClasses = {
    green: state ? 'bg-led-green shadow-led-green' : 'bg-led-off',
    red: state ? 'bg-led-red shadow-led-red' : 'bg-led-off',
    yellow: state ? 'bg-led-yellow shadow-led-yellow' : 'bg-led-off',
    blue: state ? 'bg-led-blue shadow-led-blue' : 'bg-led-off',
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          "rounded-full transition-all duration-100",
          sizeClasses[size],
          colorClasses[color],
          state === 'blink' && 'animate-led-blink',
          state && 'shadow-[0_0_4px_currentColor]'
        )}
      />
      {label && <span className="text-xxs text-gray-400">{label}</span>}
    </div>
  );
}
```

### 3.2 Manual Override Controls
**Goal**: Enable users to manipulate I/O values interactively.

#### Override Panel (Right Panel)
```typescript
// apps/web/src/components/layout/RightPanel.tsx
export function RightPanel() {
  const selectedModule = useUIStore(state => state.selectedModule);
  const selectedChannel = useUIStore(state => state.selectedChannel);

  if (!selectedModule) {
    return (
      <Panel title="Properties">
        <div className="text-gray-500 text-sm p-4">
          Select a module to view properties
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Properties">
      <ModuleProperties module={selectedModule} />
      {selectedChannel !== null && (
        <ChannelOverride
          module={selectedModule}
          channel={selectedChannel}
        />
      )}
    </Panel>
  );
}
```

#### Channel Override Component
```typescript
interface ChannelOverrideProps {
  module: Module;
  channel: number;
}

export function ChannelOverride({ module, channel }: ChannelOverrideProps) {
  const { setChannelValue } = useRackStore();
  const moduleType = MODULE_CATALOG[module.moduleNumber].type;
  const currentValue = module.values[channel];

  if (moduleType === 'digital-input') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Channel {channel} Override</label>
        <ToggleSwitch
          value={currentValue as boolean}
          onChange={(v) => setChannelValue(module.id, channel, v)}
          labels={{ on: 'HIGH', off: 'LOW' }}
        />
      </div>
    );
  }

  if (moduleType === 'analog-input') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Channel {channel} (4-20mA)</label>
        <Slider
          min={0}
          max={24}
          step={0.01}
          value={currentValue as number}
          onChange={(v) => setChannelValue(module.id, channel, v)}
        />
        <NumericInput
          value={currentValue as number}
          onChange={(v) => setChannelValue(module.id, channel, v)}
          suffix="mA"
          min={0}
          max={24}
          step={0.01}
        />
      </div>
    );
  }

  if (moduleType === 'rtd-input') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Channel {channel} Temperature</label>
        <Slider
          min={-200}
          max={850}
          step={0.1}
          value={currentValue as number}
          onChange={(v) => setChannelValue(module.id, channel, v)}
        />
        <NumericInput
          value={currentValue as number}
          onChange={(v) => setChannelValue(module.id, channel, v)}
          suffix="°C"
          min={-200}
          max={850}
          step={0.1}
        />
      </div>
    );
  }

  // Digital output - read-only display
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Channel {channel} (Output)</label>
      <div className="flex items-center gap-2">
        <LEDIndicator state={currentValue as boolean} color="red" />
        <span className="text-sm">{currentValue ? 'ACTIVE' : 'INACTIVE'}</span>
      </div>
      <p className="text-xs text-gray-500">
        Output values are controlled by the connected client
      </p>
    </div>
  );
}
```

### 3.3 Real-time Updates (Tauri)
**Goal**: Keep UI state in sync with the Rust backend.

- Use polling via `get_rack_state` or a Tauri event emitter.
- Track connection status in `connectionStore` for status bar updates.

---

## Phase 4: Testing Infrastructure (Week 7-8)

**Status (2026-01-27): ✅ SUBSTANTIALLY COMPLETE** - Playwright E2E tests are stable (32 tests passing). Python Modbus client utilities and `docs/MODBUS_MAP.md` are in place. Real-world validation completed with external Modbus clients.

**Remaining Work (Post-MVP)**
- Add automated Modbus protocol regression tests to CI.
- Expand Vitest coverage around process-image packing and module logic.
- Add fixtures for YAML rack configs and Modbus edge cases.

### 4.1 Playwright E2E Tests
**Goal**: Comprehensive browser-based testing of all UI interactions.

#### Playwright Configuration
```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### Page Object Models
```typescript
// tests/e2e/pages/RackPage.ts
import { Page, Locator } from '@playwright/test';

export class RackPage {
  readonly page: Page;
  readonly rackView: Locator;
  readonly moduleSlots: Locator;
  readonly coupler: Locator;
  readonly statusBar: Locator;
  readonly leftPanel: Locator;
  readonly rightPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rackView = page.locator('[data-testid="rack-view"]');
    this.moduleSlots = page.locator('[data-testid="module-slot"]');
    this.coupler = page.locator('[data-testid="coupler-card"]');
    this.statusBar = page.locator('[data-testid="status-bar"]');
    this.leftPanel = page.locator('[data-testid="left-panel"]');
    this.rightPanel = page.locator('[data-testid="right-panel"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.rackView.waitFor();
  }

  async addModule(moduleNumber: string, slotIndex: number) {
    // Drag from catalog to slot
    const moduleInCatalog = this.leftPanel.locator(
      `[data-module="${moduleNumber}"]`
    );
    const targetSlot = this.moduleSlots.nth(slotIndex);
    await moduleInCatalog.dragTo(targetSlot);
  }

  async selectModule(slotIndex: number) {
    await this.moduleSlots.nth(slotIndex).click();
  }

  async getModuleChannelValue(slotIndex: number, channel: number): Promise<string> {
    const module = this.moduleSlots.nth(slotIndex);
    const channelRow = module.locator(`[data-channel="${channel}"]`);
    return channelRow.locator('[data-testid="channel-value"]').textContent();
  }

  async setDigitalInputValue(slotIndex: number, channel: number, value: boolean) {
    await this.selectModule(slotIndex);
    await this.page.locator(`[data-channel="${channel}"]`).click();
    const toggle = this.rightPanel.locator('[data-testid="toggle-switch"]');
    if ((await toggle.getAttribute('aria-checked')) !== String(value)) {
      await toggle.click();
    }
  }

  async setAnalogValue(slotIndex: number, channel: number, value: number) {
    await this.selectModule(slotIndex);
    await this.page.locator(`[data-channel="${channel}"]`).click();
    const input = this.rightPanel.locator('[data-testid="numeric-input"] input');
    await input.fill(String(value));
    await input.press('Enter');
  }

  async getConnectionStatus(): Promise<string> {
    return this.statusBar.locator('[data-testid="connection-status"]').textContent();
  }

  async startSimulation() {
    await this.page.locator('[data-testid="toolbar-start"]').click();
  }

  async stopSimulation() {
    await this.page.locator('[data-testid="toolbar-stop"]').click();
  }
}
```

#### E2E Test Specs
```typescript
// tests/e2e/specs/rack-builder.spec.ts
import { test, expect } from '@playwright/test';
import { RackPage } from '../pages/RackPage';

test.describe('Rack Builder', () => {
  test('should display empty rack with coupler', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    await expect(rackPage.coupler).toBeVisible();
    await expect(rackPage.coupler).toContainText('750-362');
  });

  test('should add module from catalog', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    await rackPage.addModule('750-1405', 0);

    const firstSlot = rackPage.moduleSlots.first();
    await expect(firstSlot).toContainText('750-1405');
    await expect(firstSlot.locator('[data-testid="channel-row"]')).toHaveCount(16);
  });

  test('should show module properties when selected', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-1405', 0);

    await rackPage.selectModule(0);

    await expect(rackPage.rightPanel).toContainText('750-1405');
    await expect(rackPage.rightPanel).toContainText('16-DI 24VDC');
    await expect(rackPage.rightPanel).toContainText('Channels: 16');
  });

  test('should remove module via context menu', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-1405', 0);

    await rackPage.moduleSlots.first().click({ button: 'right' });
    await page.locator('[data-testid="context-menu-remove"]').click();

    await expect(rackPage.moduleSlots.first()).toBeEmpty();
  });
});

// tests/e2e/specs/io-visualization.spec.ts
test.describe('I/O Visualization', () => {
  test('should display correct initial values', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-1405', 0);

    // All digital inputs should be OFF initially
    for (let ch = 0; ch < 16; ch++) {
      const value = await rackPage.getModuleChannelValue(0, ch);
      expect(value).toBe('OFF');
    }
  });

  test('should show LED states for digital inputs', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-1405', 0);

    // Set channel 0 to ON
    await rackPage.setDigitalInputValue(0, 0, true);

    const led = page.locator('[data-slot="0"] [data-channel="0"] [data-testid="led"]');
    await expect(led).toHaveClass(/bg-led-green/);
  });

  test('should display analog values with units', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-455', 0);

    await rackPage.setAnalogValue(0, 0, 12.5);

    const value = await rackPage.getModuleChannelValue(0, 0);
    expect(value).toBe('12.50mA');
  });

  test('should display RTD temperatures', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-461', 0);

    await rackPage.setAnalogValue(0, 0, 25.5);

    const value = await rackPage.getModuleChannelValue(0, 0);
    expect(value).toBe('25.5°C');
  });
});

// tests/e2e/specs/manual-override.spec.ts
test.describe('Manual Override', () => {
  test('should toggle digital input', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-1405', 0);

    await rackPage.setDigitalInputValue(0, 5, true);
    expect(await rackPage.getModuleChannelValue(0, 5)).toBe('ON');

    await rackPage.setDigitalInputValue(0, 5, false);
    expect(await rackPage.getModuleChannelValue(0, 5)).toBe('OFF');
  });

  test('should set analog value via slider', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-455', 0);

    await rackPage.selectModule(0);
    await page.locator('[data-channel="0"]').click();

    const slider = page.locator('[data-testid="value-slider"]');
    await slider.fill('15.75');

    expect(await rackPage.getModuleChannelValue(0, 0)).toBe('15.75mA');
  });

  test('should validate input ranges', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.addModule('750-455', 0);

    await rackPage.selectModule(0);
    await page.locator('[data-channel="0"]').click();

    const input = page.locator('[data-testid="numeric-input"] input');
    await input.fill('30'); // Above 24mA max
    await input.press('Enter');

    // Should clamp to max
    expect(await rackPage.getModuleChannelValue(0, 0)).toBe('24.00mA');
  });
});
```

### 4.2 Modbus Client Testing
**Goal**: Verify Modbus TCP protocol compliance from external clients.

**Current Approach**
- Use `scripts/modbus_client.py` for read/write smoke tests.
- Validate addresses against `docs/MODBUS_MAP.md`.

**Remaining Work**
- Add automated regression scripts (DI/DO/AI/RTD + watchdog).
- Wire Modbus regression checks into CI.

### 4.3 Unit Tests
**Goal**: Add unit coverage for shared TypeScript utilities and Rust process-image logic.

**Current Approach**
- Favor Playwright E2E for UI flow coverage.
- Use targeted Rust unit tests for packing/unpacking and watchdog logic.

**Remaining Work**
- Add Rust unit tests in `apps/web/src-tauri/src`.
- Add shared TS tests for formatting and helpers in `packages/shared`.

---

## Phase 5: Polish & Integration (Week 9-10)

**Status (2026-01-27): 🔄 IN PROGRESS** - Keyboard shortcuts exist for core actions; native file open is implemented. Core simulation is validated. This phase is now the focus.

**Remaining Work (MVP Blockers)**
- Wire connection/client status updates to the status bar.
- Implement clearRack (File > Close Rack) end-to-end.
- Add File > Exit menu item.
- Implement save/save-as/export flows for rack configs (YAML).

**Remaining Work (MVP Polish)**
- Implement Settings dialog and persist user preferences.
- Add user-facing toasts/errors for Modbus and config failures.

**Deferred to Post-MVP**
- Scenario system.

### 5.1 Keyboard Shortcuts
```typescript
// apps/web/src/hooks/useKeyboardShortcuts.ts
const shortcuts: Shortcut[] = [
  // File operations
  { keys: 'ctrl+n', action: 'newRack', description: 'New Rack' },
  { keys: 'ctrl+o', action: 'openRack', description: 'Open Rack' },
  { keys: 'ctrl+s', action: 'saveRack', description: 'Save Rack' },
  { keys: 'ctrl+shift+s', action: 'saveRackAs', description: 'Save Rack As' },

  // Edit operations
  { keys: 'ctrl+z', action: 'undo', description: 'Undo' },
  { keys: 'ctrl+y', action: 'redo', description: 'Redo' },
  { keys: 'delete', action: 'deleteSelected', description: 'Delete Selected' },
  { keys: 'ctrl+a', action: 'selectAll', description: 'Select All' },

  // View operations
  { keys: 'ctrl+e', action: 'toggleExplorer', description: 'Toggle Explorer' },
  { keys: 'ctrl+p', action: 'toggleProperties', description: 'Toggle Properties' },
  { keys: 'ctrl+plus', action: 'zoomIn', description: 'Zoom In' },
  { keys: 'ctrl+minus', action: 'zoomOut', description: 'Zoom Out' },
  { keys: 'ctrl+0', action: 'fitToWindow', description: 'Fit to Window' },
  { keys: 'f11', action: 'toggleFullScreen', description: 'Full Screen' },

  // Simulation
  { keys: 'f5', action: 'startSimulation', description: 'Start Simulation' },
  { keys: 'f6', action: 'pauseSimulation', description: 'Pause Simulation' },
  { keys: 'shift+f5', action: 'stopSimulation', description: 'Stop Simulation' },

  // Help
  { keys: 'f1', action: 'openDocs', description: 'Documentation' },
  { keys: 'ctrl+k', action: 'showShortcuts', description: 'Keyboard Shortcuts' },
];
```

### 5.2 Scenario System (Basic)
**Status (2026-01-25):** Deferred to post-MVP unless a minimal loader is required for testing.
```typescript
// Scenario file format (JSON)
interface Scenario {
  name: string;
  description: string;
  duration: number; // ms, 0 for infinite
  steps: ScenarioStep[];
}

interface ScenarioStep {
  time: number;      // ms from start
  moduleId: string;
  channel: number;
  action: 'set' | 'pulse' | 'ramp';
  value?: number | boolean;
  duration?: number; // for pulse/ramp
  endValue?: number; // for ramp
}

// Example scenario: test-sequence.json
{
  "name": "Basic I/O Test",
  "description": "Cycles through all digital inputs",
  "duration": 0,
  "steps": [
    { "time": 0, "moduleId": "di-1", "channel": 0, "action": "set", "value": true },
    { "time": 1000, "moduleId": "di-1", "channel": 0, "action": "set", "value": false },
    { "time": 1000, "moduleId": "di-1", "channel": 1, "action": "set", "value": true },
    { "time": 2000, "moduleId": "di-1", "channel": 1, "action": "set", "value": false },
    { "time": 2000, "moduleId": "ai-1", "channel": 0, "action": "ramp", "value": 4, "endValue": 20, "duration": 5000 }
  ]
}
```

### 5.3 Settings Dialog
```typescript
// Settings categories for MVP
interface Settings {
  modbus: {
    port: number;           // Default: 502
    timeout: number;        // Default: 5000ms
    safeStateOnTimeout: boolean; // Default: true
  };
  display: {
    theme: 'light' | 'dark';
    showChannelNumbers: boolean;
    animateChanges: boolean;
    updateRate: number;     // UI refresh rate (ms)
  };
  simulation: {
    cycleTime: number;      // Process image update rate (ms)
    defaultScenario: string | null;
  };
}
```

### 5.4 Error Handling & User Feedback
```typescript
// Toast notifications for user feedback
const toastTypes = {
  success: { icon: CheckCircle, color: 'green' },
  error: { icon: XCircle, color: 'red' },
  warning: { icon: AlertTriangle, color: 'yellow' },
  info: { icon: Info, color: 'blue' },
};

// Common toast messages
const messages = {
  rackSaved: 'Rack configuration saved',
  rackLoaded: 'Rack configuration loaded',
  moduleAdded: (name: string) => `Added ${name}`,
  moduleRemoved: (name: string) => `Removed ${name}`,
  simulationStarted: 'Simulation started',
  simulationStopped: 'Simulation stopped',
  clientConnected: 'Modbus client connected',
  clientDisconnected: 'Modbus client disconnected',
  connectionError: 'Failed to connect to server',
  validationError: (msg: string) => `Validation error: ${msg}`,
};
```

---

## Phase 6: Documentation & Release (Week 11)

**Status (2026-01-25):** README and Modbus map documentation are present.

**Remaining Work**
- Add desktop/Tauri usage docs and build steps.
- Document Rust architecture (process image, watchdog, module mapping).
- Finalize release checklist for desktop packaging/signing.

### 6.1 User Documentation
- Quick Start Guide
- Module Reference (data formats, addressing)
- Scenario Scripting Guide
- Keyboard Shortcuts Reference
- Troubleshooting Guide

### 6.2 Developer Documentation
- Architecture Overview
- Adding New Module Types
- Testing Guide
- API Reference

### 6.3 Release Checklist
- [ ] All Playwright tests passing
- [ ] All Modbus integration tests passing
- [ ] All unit tests passing
- [ ] Performance testing (100+ channels)
- [ ] Cross-browser testing (Chrome, Firefox)
- [ ] Accessibility audit
- [ ] Security review (no exposed credentials)
- [ ] Documentation complete
- [ ] Version tagged in git
- [ ] Release notes written

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Modbus timing issues | Use tokio-modbus + regression scripts; validate against `docs/MODBUS_MAP.md` |
| UI/backend sync | Poll or emit Tauri events with bounded refresh intervals |
| Performance with many channels | Use virtualization for large racks; throttle UI updates |
| Cross-browser compatibility | Test early with Playwright; use well-supported APIs |
| WAGO data format accuracy | Reference official WAGO manuals; verify with real hardware if available |

---

## Success Criteria for MVP

1. **Functional Requirements**
   - [x] Single rack with coupler + 4 module types working ✅ (6 module types implemented)
   - [x] Modbus TCP server responds correctly to all function codes ✅ (validated with real clients)
   - [x] Manual override works for all I/O types ✅
   - [x] Real-time UI updates within 100ms ✅
   - [x] Scenario system deferred or minimal loader documented ✅ (deferred to post-MVP)

2. **Quality Requirements**
   - [ ] 90%+ test coverage for module logic (deferred - manual testing validated)
   - [x] All E2E tests passing ✅ (32 tests)
   - [x] No critical or high-severity bugs ✅
   - [x] UI renders correctly in Chrome and Firefox ✅

3. **Usability Requirements**
   - [x] New user can build a rack and connect in < 5 minutes ✅
   - [x] All actions have keyboard shortcuts ✅
   - [ ] Clear feedback for all operations (needs toasts/status bar work)
   - [x] Consistent visual language throughout ✅

---

## Future Enhancements (Post-MVP)

- Multiple rack support
- Additional module types (AO, serial, special function)
- Advanced scenario editor (visual timeline)
- Data logging and export
- EtherNet/IP protocol support
- CODESYS integration
- Headless/CLI mode for CI/CD
- Docker containerization
- Module fault simulation (open/short circuit, over-range)
