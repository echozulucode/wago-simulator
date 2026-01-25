# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WAGO 750 I/O System Simulator - a desktop application that emulates WAGO 750-series industrial I/O hardware. It runs a Modbus TCP server that responds exactly like real WAGO fieldbus couplers, allowing embedded developers to test PLC code without physical hardware.

## Commands

### Development
```bash
# Install dependencies (requires pnpm)
pnpm install

# Run Tauri desktop app in development
cd apps/web && pnpm tauri dev

# Run frontend only (web browser, uses mock backend)
cd apps/web && pnpm dev
```

### Building
```bash
# Build shared package first (required before other builds)
pnpm --filter @wago/shared build

# Build entire project
pnpm build

# Build Tauri app for release
cd apps/web && pnpm tauri build
```

### Testing
```bash
# Run all tests
pnpm test

# Run E2E tests (Playwright)
pnpm test:e2e

# Run single test file
cd apps/web && pnpm vitest run src/path/to/test.test.ts
```

### Type checking
```bash
pnpm typecheck
```

## Architecture

### Monorepo Structure
- `apps/web/` - React frontend with Tauri desktop wrapper
- `apps/web/src-tauri/` - Rust backend (the simulation engine)
- `apps/server/` - Node.js server (legacy, being replaced by Tauri)
- `packages/shared/` - Shared TypeScript types and constants

### Core Data Flow
1. **Frontend (React + Zustand)** polls backend at 10Hz via Tauri IPC
2. **Backend (Rust)** maintains simulator state and runs Modbus TCP server on port 502
3. **External PLC/client** connects via Modbus TCP, reads/writes I/O as if talking to real WAGO hardware

### Key Rust Modules (`apps/web/src-tauri/src/`)
- `lib.rs` - Tauri command handlers (IPC entry points from frontend)
- `state.rs` - `Simulator` struct: holds rack config, module instances, Modbus register mapping
- `modules.rs` - `Module` trait and implementations for each I/O card type (DI, DO, AI, AO, RTD, Counter)
- `server.rs` - Modbus TCP server using `tokio-modbus`
- `models.rs` - Data structures (RackConfig, ModuleInstance, ModuleState)

### Frontend State Management
- `rackStore.ts` - Main Zustand store, syncs with Rust backend
- `tauriApi.ts` - Wrapper for Tauri invoke calls, falls back to mock when not in Tauri

### Module Type System
Modules are created via factory pattern in `modules.rs::create_module()`. Each module type (identified by WAGO part number like "750-1405") implements the `Module` trait with:
- `read_inputs()` / `write_outputs()` - Process image byte operations
- `get_input_image_size()` / `get_output_image_size()` - Byte counts for Modbus mapping
- `set_channel_value()` - UI-driven value changes

### Modbus Register Mapping (WAGO-compatible)
- Discrete Inputs (FC02): Digital input modules packed as bits
- Coils (FC01/05/15): Digital output modules packed as bits
- Input Registers (FC04): Analog input modules as consecutive 16-bit words
- Holding Registers (FC03/06/16): Analog output modules + watchdog config at 0x1000 + metadata at 0x2000+

## Configuration Files

Rack configurations can be loaded from YAML files. Example structure:
```yaml
transport:
  listen: { host: "0.0.0.0", port: 502 }
  unit_id: 1
racks:
  - id: "rack-1"
    name: "Test Rack"
    modules:
      - { id: "di-1", model: "750-1405", name: "Digital In 16ch" }
      - { id: "ao-1", model: "750-563", name: "Analog Out 2ch" }
```

## Supported Module Types

| Part Number | Type | Channels |
|-------------|------|----------|
| 750-1405, 750-1415, 750-430, 753-440 | Digital Input | 16, 8, 8, 4 |
| 750-1504, 750-1515, 750-530, 750-515 | Digital Output | 16, 8, 8, 4 |
| 750-455, 750-454 | Analog Input (4-20mA) | 4, 2 |
| 750-461, 750-464 | RTD/Pt100 Input | 2, 4 |
| 750-563, 750-555 | Analog Output | 2, 4 |
| 750-404, 750-633 | Counter | 1 |

## Testing with External Clients

A Python script is provided to test the Modbus server:
```bash
pip install pymodbus
python scripts/modbus_client.py --host 127.0.0.1 --port 502
python scripts/modbus_client.py --demo  # Run demo writes
```

## Documentation

- `docs/MODBUS_MAP.md` - Complete Modbus address mapping and data formats
- `docs/STATUS.md` - Project status ledger (reverse-chronological). Update when completing significant work.
