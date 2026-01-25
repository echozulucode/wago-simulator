# Project Status: WAGO 750 Simulator

Last Updated: 2026-01-25

## I. Current Context (The "State")

*   **Active Sprint/Phase:** Phase 3: UI Polish & Documentation
*   **Current Objective:** File open dialog, Modbus testing tools, documentation.
*   **Current Blockers:** Drag-and-drop for adding modules still not working.
*   **Active Working Files:**
    *   `apps/web/src/components/layout/MenuBar.tsx`
    *   `docs/MODBUS_MAP.md`
    *   `scripts/modbus_client.py`

## II. Execution Log (The "Ledger")

Rule: New entries are added to the TOP of this list (Reverse Chronological).

### [2026-01-25] - Native File Dialog & Modbus Documentation

*   **Action:** Added native file open dialog for loading rack configs.
*   **Detail:**
    *   Enabled `tauri-plugin-dialog` in Rust backend and capabilities.
    *   Added `openConfigDialog()` to frontend API using `@tauri-apps/plugin-dialog`.
    *   Updated "Open..." menu item to use native OS file picker.
*   **Outcome:** Success. File > Open now shows standard OS dialog.
*   **Artifacts:**
    *   `apps/web/src-tauri/src/lib.rs` (plugin init)
    *   `apps/web/src-tauri/capabilities/default.json` (permissions)
    *   `apps/web/src/api/tauri.ts` (dialog API)
    *   `apps/web/src/components/layout/MenuBar.tsx` (menu action)

### [2026-01-25] - Modbus Client Script & Address Documentation

*   **Action:** Created Python Modbus client and comprehensive address mapping docs.
*   **Detail:**
    *   `scripts/modbus_client.py`: Demo script using pymodbus to read/write simulator.
    *   `docs/MODBUS_MAP.md`: Complete documentation of Modbus address mapping.
*   **Outcome:** Success. External clients can now test against simulator.
*   **Artifacts:** `scripts/modbus_client.py`, `docs/MODBUS_MAP.md`

### [2026-01-24] - Counter Module Implementation

*   **Action:** Implemented `CounterModule` (750-404, 750-633).
*   **Detail:** 
    *   Added `CounterModule` struct implementing `Module` trait.
    *   Configured PDI: 3 words Input (Status, Count LSW, Count MSW), 3 words Output (Control, Preset LSW, Preset MSW).
    *   Updated `state.rs` mapping logic to include counters in both Analog Input and Analog Output loops.
*   **Outcome:** Success. Abstractions support mixed I/O modules correctly.
*   **Artifacts:** `apps/web/src-tauri/src/{modules.rs, state.rs}`

### [2026-01-24] - Implemented WAGO Process Model Features

*   **Action:** Updated Rust backend to support WAGO-specific Modbus features.
    *   **Metadata Registers (0x2000+):** Implemented `read_special_input_registers`.
    *   **Watchdog (0x1000):** Implemented watchdog logic.
    *   **Modbus Server Fix:** Corrected `server.serve` implementation.
*   **Outcome:** Success. Backend compiles and implements key WAGO behaviors.

### [2026-01-24] - Enabled Modbus TCP Server

*   **Action:** Fixed `tokio-modbus` implementation.
*   **Outcome:** Success. Backend compiles.

### [2026-01-24] - UI Polish & Module Width Adjustment

*   **Action:** Increased width of `IOCard` to `w-24` and `CouplerCard` to `w-32`.
*   **Outcome:** Success. Text labels now fit.

### [2026-01-24] - E2E Test Stabilization

*   **Action:** Fixed Playwright test failures.
*   **Outcome:** Success. All 32 E2E tests passed.

### [2026-01-24] - Rust/Tauri Backend Migration

*   **Action:** Ported "The Brain" from Node.js to Rust (`src-tauri`).
*   **Outcome:** Success.