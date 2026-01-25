# WAGO 750 Simulator - MVP Implementation Plan

## Executive Summary

This document outlines a phased approach to building a Minimum Viable Product (MVP) for the WAGO 750 I/O System Simulator. The MVP focuses on a **single rack configuration** with a limited set of I/O modules, a **polished, production-ready UI shell**, and comprehensive testing infrastructure using Playwright and Modbus clients.

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
| **React Query** | Server state and API caching |
| **Lucide React** | Consistent icon library |
| **Headless UI** | Accessible UI primitives |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | REST API server |
| **TypeScript** | Shared types with frontend |
| **modbus-serial** | Modbus TCP server implementation |
| **WebSocket (ws)** | Real-time UI updates |
| **Zod** | Runtime validation |

### Testing
| Technology | Purpose |
|------------|---------|
| **Playwright** | End-to-end browser testing |
| **Vitest** | Unit and integration tests |
| **modbus-serial (client mode)** | Modbus protocol testing |
| **MSW** | API mocking for frontend tests |

### DevOps
| Technology | Purpose |
|------------|---------|
| **pnpm** | Fast, disk-efficient package manager |
| **ESLint + Prettier** | Code quality and formatting |
| **Husky** | Git hooks for pre-commit checks |
| **GitHub Actions** | CI/CD pipeline |

---

## MVP Scope

### Single Rack Configuration
- **1x Fieldbus Coupler**: 750-362 (Modbus TCP)
- **Limited I/O Modules** (4 cards for MVP):
  - **750-1405**: 16-Channel Digital Input (24V DC)
  - **750-1504**: 16-Channel Digital Output (24V DC)
  - **750-461**: 2-Channel RTD Input (Pt100)
  - **750-455**: 4-Channel Analog Input (4-20mA)

### MVP Features
1. Visual rack builder with drag-and-drop card placement
2. Real-time I/O state visualization
3. Manual override controls for all I/O points
4. Modbus TCP server (port 502)
5. WebSocket-based live updates
6. Basic scenario loading (JSON-based)
7. Full UI shell (menus, toolbars, panels, status bar)

---

## Project Structure

```
wago-simulator/
├── apps/
│   ├── web/                      # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/       # App shell components
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── MenuBar.tsx
│   │   │   │   │   ├── Toolbar.tsx
│   │   │   │   │   ├── LeftPanel.tsx
│   │   │   │   │   ├── RightPanel.tsx
│   │   │   │   │   ├── StatusBar.tsx
│   │   │   │   │   └── WorkArea.tsx
│   │   │   │   ├── rack/         # Rack visualization
│   │   │   │   │   ├── RackView.tsx
│   │   │   │   │   ├── ModuleSlot.tsx
│   │   │   │   │   ├── CouplerCard.tsx
│   │   │   │   │   └── IOCard.tsx
│   │   │   │   ├── modules/      # Per-module-type components
│   │   │   │   │   ├── DigitalInputCard.tsx
│   │   │   │   │   ├── DigitalOutputCard.tsx
│   │   │   │   │   ├── AnalogInputCard.tsx
│   │   │   │   │   └── RTDInputCard.tsx
│   │   │   │   ├── controls/     # Reusable UI controls
│   │   │   │   │   ├── LEDIndicator.tsx
│   │   │   │   │   ├── ToggleSwitch.tsx
│   │   │   │   │   ├── ValueDisplay.tsx
│   │   │   │   │   ├── Slider.tsx
│   │   │   │   │   └── NumericInput.tsx
│   │   │   │   ├── dialogs/      # Modal dialogs
│   │   │   │   │   ├── AddModuleDialog.tsx
│   │   │   │   │   ├── SettingsDialog.tsx
│   │   │   │   │   └── AboutDialog.tsx
│   │   │   │   └── common/       # Shared components
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Dropdown.tsx
│   │   │   │       ├── Tooltip.tsx
│   │   │   │       └── Panel.tsx
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   ├── useModbus.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── useRackState.ts
│   │   │   │   └── useKeyboardShortcuts.ts
│   │   │   ├── stores/           # Zustand stores
│   │   │   │   ├── rackStore.ts
│   │   │   │   ├── uiStore.ts
│   │   │   │   └── connectionStore.ts
│   │   │   ├── api/              # API client functions
│   │   │   │   ├── client.ts
│   │   │   │   ├── rack.ts
│   │   │   │   └── modules.ts
│   │   │   ├── types/            # TypeScript types
│   │   │   │   ├── rack.ts
│   │   │   │   ├── modules.ts
│   │   │   │   └── api.ts
│   │   │   ├── utils/            # Utility functions
│   │   │   │   ├── modbus.ts
│   │   │   │   └── formatting.ts
│   │   │   ├── styles/           # Global styles
│   │   │   │   └── globals.css
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   └── tsconfig.json
│   │
│   └── server/                   # Node.js backend
│       ├── src/
│       │   ├── index.ts          # Entry point
│       │   ├── server.ts         # Express app setup
│       │   ├── modbus/           # Modbus TCP server
│       │   │   ├── ModbusServer.ts
│       │   │   ├── ProcessImage.ts
│       │   │   └── AddressMap.ts
│       │   ├── modules/          # I/O module implementations
│       │   │   ├── BaseModule.ts
│       │   │   ├── ModuleFactory.ts
│       │   │   ├── ModuleRegistry.ts
│       │   │   ├── DigitalInputModule.ts
│       │   │   ├── DigitalOutputModule.ts
│       │   │   ├── AnalogInputModule.ts
│       │   │   └── RTDModule.ts
│       │   ├── rack/             # Rack management
│       │   │   ├── Rack.ts
│       │   │   ├── RackManager.ts
│       │   │   └── Coupler.ts
│       │   ├── scenarios/        # Scenario engine
│       │   │   ├── ScenarioLoader.ts
│       │   │   ├── ScenarioRunner.ts
│       │   │   └── types.ts
│       │   ├── websocket/        # WebSocket handler
│       │   │   └── WSHandler.ts
│       │   ├── routes/           # REST API routes
│       │   │   ├── rack.ts
│       │   │   ├── modules.ts
│       │   │   ├── scenarios.ts
│       │   │   └── system.ts
│       │   ├── config/           # Configuration
│       │   │   ├── default.ts
│       │   │   └── schema.ts
│       │   └── types/            # TypeScript types
│       │       ├── rack.ts
│       │       ├── modules.ts
│       │       └── modbus.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                   # Shared types and utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── rack.ts
│       │   │   ├── modules.ts
│       │   │   └── api.ts
│       │   ├── constants/
│       │   │   ├── modules.ts    # Module definitions
│       │   │   └── modbus.ts     # Modbus constants
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── tests/
│   ├── e2e/                      # Playwright tests
│   │   ├── fixtures/
│   │   │   └── test-rack.json
│   │   ├── pages/                # Page Object Models
│   │   │   ├── BasePage.ts
│   │   │   ├── RackPage.ts
│   │   │   └── SettingsPage.ts
│   │   ├── specs/
│   │   │   ├── rack-builder.spec.ts
│   │   │   ├── io-visualization.spec.ts
│   │   │   ├── manual-override.spec.ts
│   │   │   └── modbus-integration.spec.ts
│   │   └── playwright.config.ts
│   │
│   ├── modbus/                   # Modbus client tests
│   │   ├── client.ts             # Test Modbus client
│   │   ├── digital-io.test.ts
│   │   ├── analog-io.test.ts
│   │   └── rtd-io.test.ts
│   │
│   └── unit/                     # Unit tests
│       ├── modules/
│       └── utils/
│
├── scenarios/                    # Scenario files
│   ├── default.json
│   └── test-sequence.json
│
├── docs/
│   └── ai/
│       └── plans/
│           ├── wago-750-simulator-design.md
│           └── mvp-implementation-plan.md
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Scaffolding
**Goal**: Set up monorepo structure with all tooling configured.

#### Tasks
- [ ] Initialize pnpm workspace with `apps/web`, `apps/server`, `packages/shared`
- [ ] Configure Vite for React + TypeScript
- [ ] Configure Tailwind CSS with custom theme (WAGO orange: `#FF6600`)
- [ ] Set up ESLint, Prettier, Husky
- [ ] Create TypeScript path aliases across packages
- [ ] Configure development proxy (Vite → Express)

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

### 1.3 Backend Foundation
**Goal**: Set up Express server with basic REST API and WebSocket support.

#### Tasks
- [ ] Create Express server with TypeScript
- [ ] Set up REST API routes (CRUD for rack configuration)
- [ ] Implement WebSocket server for real-time updates
- [ ] Create basic rack and module data structures
- [ ] Implement module factory pattern

#### API Endpoints
```typescript
// Rack Management
GET    /api/rack              // Get current rack configuration
POST   /api/rack              // Create/replace rack configuration
DELETE /api/rack              // Clear rack

// Module Management
GET    /api/modules           // List available module types
GET    /api/rack/modules      // List modules in current rack
POST   /api/rack/modules      // Add module to rack
DELETE /api/rack/modules/:id  // Remove module from rack
PATCH  /api/rack/modules/:id  // Update module position/config

// I/O State
GET    /api/io                // Get all I/O states
GET    /api/io/:moduleId      // Get specific module I/O state
PUT    /api/io/:moduleId/:channel  // Set I/O value (manual override)

// Simulation Control
POST   /api/simulation/start  // Start simulation
POST   /api/simulation/pause  // Pause simulation
POST   /api/simulation/stop   // Stop simulation
GET    /api/simulation/status // Get simulation status

// Scenarios
GET    /api/scenarios         // List available scenarios
POST   /api/scenarios/load    // Load and run scenario

// System
GET    /api/system/health     // Health check
GET    /api/system/info       // System information
```

---

## Phase 2: Core Simulation Engine (Week 3-4)

### 2.1 Modbus TCP Server Implementation
**Goal**: Implement WAGO-compatible Modbus TCP server.

#### Architecture
```typescript
// apps/server/src/modbus/ModbusServer.ts
export class ModbusServer {
  private server: net.Server;
  private processImage: ProcessImage;
  private clients: Map<string, ModbusClient>;

  constructor(port: number = 502) { ... }

  // Supported function codes
  handleReadCoils(startAddr: number, quantity: number): boolean[];
  handleReadDiscreteInputs(startAddr: number, quantity: number): boolean[];
  handleReadHoldingRegisters(startAddr: number, quantity: number): number[];
  handleReadInputRegisters(startAddr: number, quantity: number): number[];
  handleWriteSingleCoil(addr: number, value: boolean): void;
  handleWriteSingleRegister(addr: number, value: number): void;
  handleWriteMultipleCoils(startAddr: number, values: boolean[]): void;
  handleWriteMultipleRegisters(startAddr: number, values: number[]): void;
}
```

#### Process Image Structure
```typescript
// Mirrors WAGO 750-362 memory layout
export class ProcessImage {
  // Input process image (read by master)
  private inputCoils: BitArray;        // Discrete inputs (DI states)
  private inputRegisters: Uint16Array; // Analog inputs, RTD values

  // Output process image (written by master)
  private outputCoils: BitArray;       // Discrete outputs (DO commands)
  private holdingRegisters: Uint16Array; // Analog outputs, config

  // Address mapping per module
  private moduleAddressMap: Map<string, AddressRange>;

  buildFromRack(rack: Rack): void;
  getModuleInputAddress(moduleId: string): AddressRange;
  getModuleOutputAddress(moduleId: string): AddressRange;
}
```

### 2.2 Module Implementations
**Goal**: Implement the 4 MVP module types with accurate data formats.

#### Base Module Interface
```typescript
// apps/server/src/modules/BaseModule.ts
export interface IModule {
  readonly id: string;
  readonly type: string;
  readonly moduleNumber: string;  // e.g., "750-1405"
  readonly channels: number;
  readonly processImageSize: number;

  // Process image interaction
  readInputs(): Uint8Array;
  writeOutputs(data: Uint8Array): void;

  // Simulation
  setChannelValue(channel: number, value: number | boolean): void;
  getChannelValue(channel: number): number | boolean;
  setFault(channel: number, fault: FaultType): void;
  clearFault(channel: number): void;

  // State serialization
  getState(): ModuleState;
  setState(state: ModuleState): void;
}
```

#### Digital Input Module (750-1405)
```typescript
export class DigitalInputModule implements IModule {
  moduleNumber = '750-1405';
  channels = 16;
  processImageSize = 2; // 16 bits = 2 bytes

  private inputStates: boolean[] = new Array(16).fill(false);
  private faults: FaultType[] = new Array(16).fill(null);

  readInputs(): Uint8Array {
    // Pack 16 booleans into 2 bytes, LSB first (WAGO format)
    const byte0 = this.packByte(this.inputStates.slice(0, 8));
    const byte1 = this.packByte(this.inputStates.slice(8, 16));
    return new Uint8Array([byte0, byte1]);
  }

  setChannelValue(channel: number, value: boolean): void {
    this.inputStates[channel] = value;
    this.emit('change', { channel, value });
  }
}
```

#### Digital Output Module (750-1504)
```typescript
export class DigitalOutputModule implements IModule {
  moduleNumber = '750-1504';
  channels = 16;
  processImageSize = 2;

  private outputStates: boolean[] = new Array(16).fill(false);

  writeOutputs(data: Uint8Array): void {
    // Unpack 2 bytes into 16 booleans
    this.outputStates = [
      ...this.unpackByte(data[0]),
      ...this.unpackByte(data[1]),
    ];
    this.emit('change', { states: this.outputStates });
  }

  // Readback for verification
  readInputs(): Uint8Array {
    return this.packStates(this.outputStates);
  }
}
```

#### RTD Input Module (750-461)
```typescript
export class RTDModule implements IModule {
  moduleNumber = '750-461';
  channels = 2;
  processImageSize = 6; // 2x (16-bit value + 8-bit status)

  private temperatures: number[] = [20.0, 20.0]; // °C
  private statuses: number[] = [0, 0];

  readInputs(): Uint8Array {
    // WAGO format: [Value_Lo, Value_Hi, Status] per channel
    const buffer = new Uint8Array(6);
    for (let ch = 0; ch < 2; ch++) {
      const rawValue = this.temperatureToRaw(this.temperatures[ch]);
      buffer[ch * 3 + 0] = rawValue & 0xFF;
      buffer[ch * 3 + 1] = (rawValue >> 8) & 0xFF;
      buffer[ch * 3 + 2] = this.statuses[ch];
    }
    return buffer;
  }

  private temperatureToRaw(tempC: number): number {
    // WAGO Pt100: 0.1°C resolution, -200 to +850°C range
    // Raw value = (temp + 200) * 10
    return Math.round((tempC + 200) * 10);
  }

  setTemperature(channel: number, tempC: number): void {
    this.temperatures[channel] = Math.max(-200, Math.min(850, tempC));
    this.emit('change', { channel, temperature: this.temperatures[channel] });
  }
}
```

#### Analog Input Module (750-455)
```typescript
export class AnalogInputModule implements IModule {
  moduleNumber = '750-455';
  channels = 4;
  processImageSize = 8; // 4x 16-bit values

  private values: number[] = [4.0, 4.0, 4.0, 4.0]; // mA

  readInputs(): Uint8Array {
    const buffer = new Uint8Array(8);
    for (let ch = 0; ch < 4; ch++) {
      const rawValue = this.currentToRaw(this.values[ch]);
      buffer[ch * 2 + 0] = rawValue & 0xFF;
      buffer[ch * 2 + 1] = (rawValue >> 8) & 0xFF;
    }
    return buffer;
  }

  private currentToRaw(mA: number): number {
    // WAGO 750-455: 4-20mA mapped to 0x0000-0x7FFF
    // 4mA = 0x0000, 20mA = 0x7FFF
    const normalized = (mA - 4) / 16; // 0.0 to 1.0
    return Math.round(normalized * 0x7FFF);
  }

  setCurrent(channel: number, mA: number): void {
    this.values[channel] = Math.max(0, Math.min(24, mA)); // Allow 0-24mA
    this.emit('change', { channel, current: this.values[channel] });
  }
}
```

### 2.3 Module Factory
```typescript
// apps/server/src/modules/ModuleFactory.ts
export class ModuleFactory {
  private static registry: Map<string, ModuleConstructor> = new Map([
    ['750-1405', DigitalInputModule],
    ['750-1504', DigitalOutputModule],
    ['750-461', RTDModule],
    ['750-455', AnalogInputModule],
  ]);

  static create(moduleNumber: string, slotPosition: number): IModule {
    const Constructor = this.registry.get(moduleNumber);
    if (!Constructor) {
      throw new Error(`Unknown module: ${moduleNumber}`);
    }
    return new Constructor(slotPosition);
  }

  static register(moduleNumber: string, constructor: ModuleConstructor): void {
    this.registry.set(moduleNumber, constructor);
  }

  static getAvailableModules(): ModuleDefinition[] {
    return Array.from(this.registry.keys()).map(num => MODULE_CATALOG[num]);
  }
}
```

---

## Phase 3: UI Visualization (Week 5-6)

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

### 3.3 Real-time Updates via WebSocket
**Goal**: Push I/O state changes to UI in real-time.

```typescript
// apps/web/src/hooks/useWebSocket.ts
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const { updateModuleState, setConnectionStatus } = useRackStore();

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
      setConnected(true);
      setConnectionStatus('connected');
    };

    ws.onclose = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'io-update':
          updateModuleState(message.moduleId, message.values);
          break;
        case 'client-connected':
          // Handle Modbus client connect
          break;
        case 'client-disconnected':
          // Handle Modbus client disconnect
          break;
        case 'simulation-state':
          // Handle simulation state change
          break;
      }
    };

    return () => ws.close();
  }, []);

  return { connected };
}
```

---

## Phase 4: Testing Infrastructure (Week 7-8)

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
**Goal**: Verify Modbus TCP protocol compliance using a dedicated test client.

#### Test Modbus Client Setup
```typescript
// tests/modbus/client.ts
import ModbusRTU from 'modbus-serial';

export class TestModbusClient {
  private client: ModbusRTU;

  constructor() {
    this.client = new ModbusRTU();
  }

  async connect(host: string = 'localhost', port: number = 502): Promise<void> {
    await this.client.connectTCP(host, { port });
    this.client.setID(1);
    this.client.setTimeout(5000);
  }

  async disconnect(): Promise<void> {
    this.client.close(() => {});
  }

  // Digital Inputs (Function Code 02)
  async readDiscreteInputs(startAddr: number, quantity: number): Promise<boolean[]> {
    const result = await this.client.readDiscreteInputs(startAddr, quantity);
    return result.data;
  }

  // Digital Outputs / Coils (Function Code 01, 05, 15)
  async readCoils(startAddr: number, quantity: number): Promise<boolean[]> {
    const result = await this.client.readCoils(startAddr, quantity);
    return result.data;
  }

  async writeSingleCoil(addr: number, value: boolean): Promise<void> {
    await this.client.writeCoil(addr, value);
  }

  async writeMultipleCoils(startAddr: number, values: boolean[]): Promise<void> {
    await this.client.writeCoils(startAddr, values);
  }

  // Analog Inputs (Function Code 04)
  async readInputRegisters(startAddr: number, quantity: number): Promise<number[]> {
    const result = await this.client.readInputRegisters(startAddr, quantity);
    return result.data;
  }

  // Holding Registers (Function Code 03, 06, 16)
  async readHoldingRegisters(startAddr: number, quantity: number): Promise<number[]> {
    const result = await this.client.readHoldingRegisters(startAddr, quantity);
    return result.data;
  }

  async writeSingleRegister(addr: number, value: number): Promise<void> {
    await this.client.writeRegister(addr, value);
  }

  async writeMultipleRegisters(startAddr: number, values: number[]): Promise<void> {
    await this.client.writeRegisters(startAddr, values);
  }
}
```

#### Modbus Integration Tests
```typescript
// tests/modbus/digital-io.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestModbusClient } from './client';
import { spawn, ChildProcess } from 'child_process';

describe('Digital I/O Modbus Communication', () => {
  let serverProcess: ChildProcess;
  let client: TestModbusClient;

  beforeAll(async () => {
    // Start simulator server
    serverProcess = spawn('pnpm', ['--filter', '@wago/server', 'start'], {
      stdio: 'pipe',
      env: { ...process.env, RACK_CONFIG: './fixtures/test-rack.json' },
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    client = new TestModbusClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    serverProcess.kill();
  });

  beforeEach(async () => {
    // Reset all I/O to default state via REST API
    await fetch('http://localhost:3000/api/simulation/reset', { method: 'POST' });
  });

  describe('750-1405 Digital Input Module', () => {
    test('should read all inputs as OFF initially', async () => {
      const inputs = await client.readDiscreteInputs(0, 16);
      expect(inputs).toHaveLength(16);
      expect(inputs.every(v => v === false)).toBe(true);
    });

    test('should reflect simulated input changes', async () => {
      // Set input 0 via REST API
      await fetch('http://localhost:3000/api/io/module-0/0', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: true }),
      });

      const inputs = await client.readDiscreteInputs(0, 16);
      expect(inputs[0]).toBe(true);
      expect(inputs.slice(1).every(v => v === false)).toBe(true);
    });

    test('should handle reading subset of inputs', async () => {
      const inputs = await client.readDiscreteInputs(8, 4);
      expect(inputs).toHaveLength(4);
    });
  });

  describe('750-1504 Digital Output Module', () => {
    test('should write and read back single coil', async () => {
      await client.writeSingleCoil(16, true); // First output after 16 inputs

      const outputs = await client.readCoils(16, 16);
      expect(outputs[0]).toBe(true);
    });

    test('should write multiple coils', async () => {
      const pattern = [true, false, true, false, true, true, false, false];
      await client.writeMultipleCoils(16, pattern);

      const outputs = await client.readCoils(16, 8);
      expect(outputs).toEqual(pattern);
    });

    test('should clear outputs on communication timeout', async () => {
      await client.writeSingleCoil(16, true);

      // Simulate timeout by disconnecting
      await client.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reconnect and check outputs are cleared
      await client.connect();
      const outputs = await client.readCoils(16, 16);
      expect(outputs.every(v => v === false)).toBe(true);
    });
  });
});

// tests/modbus/analog-io.test.ts
describe('Analog I/O Modbus Communication', () => {
  let client: TestModbusClient;

  // ... setup ...

  describe('750-455 Analog Input Module (4-20mA)', () => {
    test('should read zero-scale value (4mA)', async () => {
      // Set channel 0 to 4mA via API
      await fetch('http://localhost:3000/api/io/module-2/0', {
        method: 'PUT',
        body: JSON.stringify({ value: 4.0 }),
      });

      const registers = await client.readInputRegisters(32, 1);
      expect(registers[0]).toBe(0x0000);
    });

    test('should read full-scale value (20mA)', async () => {
      await fetch('http://localhost:3000/api/io/module-2/0', {
        method: 'PUT',
        body: JSON.stringify({ value: 20.0 }),
      });

      const registers = await client.readInputRegisters(32, 1);
      expect(registers[0]).toBe(0x7FFF);
    });

    test('should read mid-scale value (12mA)', async () => {
      await fetch('http://localhost:3000/api/io/module-2/0', {
        method: 'PUT',
        body: JSON.stringify({ value: 12.0 }),
      });

      const registers = await client.readInputRegisters(32, 1);
      // 12mA is 50% of 4-20mA range = 0x3FFF
      expect(registers[0]).toBeCloseTo(0x3FFF, -2);
    });

    test('should read all four channels', async () => {
      const values = [4.0, 8.0, 12.0, 20.0];
      for (let ch = 0; ch < 4; ch++) {
        await fetch(`http://localhost:3000/api/io/module-2/${ch}`, {
          method: 'PUT',
          body: JSON.stringify({ value: values[ch] }),
        });
      }

      const registers = await client.readInputRegisters(32, 4);
      expect(registers).toHaveLength(4);
      expect(registers[0]).toBe(0x0000);      // 4mA
      expect(registers[1]).toBeCloseTo(0x1FFF, -2); // 8mA
      expect(registers[2]).toBeCloseTo(0x3FFF, -2); // 12mA
      expect(registers[3]).toBe(0x7FFF);      // 20mA
    });
  });

  describe('750-461 RTD Input Module (Pt100)', () => {
    test('should read temperature in WAGO format', async () => {
      // Set temperature to 25.0°C
      await fetch('http://localhost:3000/api/io/module-3/0', {
        method: 'PUT',
        body: JSON.stringify({ value: 25.0 }),
      });

      const registers = await client.readInputRegisters(36, 3);
      // WAGO format: raw = (temp + 200) * 10 = 2250
      expect(registers[0]).toBe(2250);
    });

    test('should handle negative temperatures', async () => {
      await fetch('http://localhost:3000/api/io/module-3/0', {
        method: 'PUT',
        body: JSON.stringify({ value: -50.0 }),
      });

      const registers = await client.readInputRegisters(36, 3);
      // raw = (-50 + 200) * 10 = 1500
      expect(registers[0]).toBe(1500);
    });

    test('should include status byte', async () => {
      // Normal status = 0
      const registers = await client.readInputRegisters(36, 3);
      expect(registers[2] & 0xFF).toBe(0); // Status byte
    });
  });
});
```

### 4.3 Unit Tests
```typescript
// tests/unit/modules/DigitalInputModule.test.ts
import { describe, test, expect } from 'vitest';
import { DigitalInputModule } from '@wago/server/modules/DigitalInputModule';

describe('DigitalInputModule', () => {
  test('should initialize with all inputs OFF', () => {
    const module = new DigitalInputModule(0);
    const state = module.getState();
    expect(state.values.every(v => v === false)).toBe(true);
  });

  test('should pack inputs into correct byte format', () => {
    const module = new DigitalInputModule(0);

    // Set channels 0, 2, 8
    module.setChannelValue(0, true);
    module.setChannelValue(2, true);
    module.setChannelValue(8, true);

    const data = module.readInputs();
    expect(data[0]).toBe(0b00000101); // Bits 0 and 2
    expect(data[1]).toBe(0b00000001); // Bit 8 (first bit of second byte)
  });

  test('should emit change events', () => {
    const module = new DigitalInputModule(0);
    const changes: any[] = [];

    module.on('change', (e) => changes.push(e));
    module.setChannelValue(5, true);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ channel: 5, value: true });
  });
});

// tests/unit/modules/AnalogInputModule.test.ts
describe('AnalogInputModule', () => {
  test('should convert 4mA to 0x0000', () => {
    const module = new AnalogInputModule(0);
    module.setCurrent(0, 4.0);

    const data = module.readInputs();
    const value = data[0] | (data[1] << 8);
    expect(value).toBe(0x0000);
  });

  test('should convert 20mA to 0x7FFF', () => {
    const module = new AnalogInputModule(0);
    module.setCurrent(0, 20.0);

    const data = module.readInputs();
    const value = data[0] | (data[1] << 8);
    expect(value).toBe(0x7FFF);
  });

  test('should clamp out-of-range values', () => {
    const module = new AnalogInputModule(0);

    module.setCurrent(0, -5.0);
    expect(module.getChannelValue(0)).toBe(0);

    module.setCurrent(0, 30.0);
    expect(module.getChannelValue(0)).toBe(24);
  });
});
```

---

## Phase 5: Polish & Integration (Week 9-10)

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
| Modbus timing issues | Use established modbus-serial library; add extensive protocol tests |
| WebSocket reliability | Implement reconnection logic; queue updates during disconnect |
| Performance with many channels | Use virtualization for large racks; throttle UI updates |
| Cross-browser compatibility | Test early with Playwright; use well-supported APIs |
| WAGO data format accuracy | Reference official WAGO manuals; verify with real hardware if available |

---

## Success Criteria for MVP

1. **Functional Requirements**
   - [ ] Single rack with coupler + 4 module types working
   - [ ] Modbus TCP server responds correctly to all function codes
   - [ ] Manual override works for all I/O types
   - [ ] Real-time UI updates within 100ms
   - [ ] Basic scenario loading and execution

2. **Quality Requirements**
   - [ ] 90%+ test coverage for module logic
   - [ ] All E2E tests passing
   - [ ] No critical or high-severity bugs
   - [ ] UI renders correctly in Chrome and Firefox

3. **Usability Requirements**
   - [ ] New user can build a rack and connect in < 5 minutes
   - [ ] All actions have keyboard shortcuts
   - [ ] Clear feedback for all operations
   - [ ] Consistent visual language throughout

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
