# Project Status: WAGO 750 Simulator

Last Updated: 2026-01-27

## I. Current Context (The "State")

*   **Active Sprint/Phase:** Phase 5: Polish & Integration
*   **Current Objective:** Complete UI shell functionality and prepare for MVP release.
*   **Current Blockers:** None.
*   **Active Working Files:**
    *   `apps/web/src/components/layout/LeftPanel.tsx`
    *   `apps/web/src/components/common/Panel.tsx`

## II. Execution Log (The "Ledger")

Rule: New entries are added to the TOP of this list (Reverse Chronological).

### [2026-01-27] - Module Catalog Scrollbar Fix (AI-ISSUE-2026012502)

*   **Action:** Fixed scrollbar visibility for Module Catalog when content overflows.
*   **Detail:**
    *   Added `overflow-hidden` to LeftPanel container for proper flex constraints.
    *   Added `flex-shrink-0` to Rack Explorer panel to prevent unwanted shrinking.
    *   Added `min-h-0` to Module Catalog panel for proper flex shrinking.
    *   Added `overflow-hidden` to Panel component for consistent behavior.
*   **Outcome:** Success. Module Catalog now shows scrollbar when content overflows.
*   **Artifacts:**
    *   `apps/web/src/components/layout/LeftPanel.tsx`
    *   `apps/web/src/components/common/Panel.tsx`

### [2026-01-27] - Drag-and-Drop WebView2 Compatibility (AI-ISSUE-2026012501)

*   **Action:** Fixed drag-and-drop in Tauri WebView2 environment.
*   **Detail:**
    *   Disabled Tauri's file drop handling (`dragDropEnabled: false` in tauri.conf.json).
    *   Added global CSS for `[draggable="true"]` with `-webkit-user-drag: element`.
    *   Added `pointer-events: none` to child elements in DraggableModule.
    *   Set data in both `text/plain` and `text` formats for compatibility.
*   **Outcome:** Success. Drag-and-drop now works correctly in Tauri desktop app.
*   **Artifacts:**
    *   `apps/web/src-tauri/tauri.conf.json`
    *   `apps/web/src/styles/globals.css`
    *   `apps/web/src/components/layout/LeftPanel.tsx`

### [2026-01-27] - Drag-and-Drop Module Fix (AI-ISSUE-2026012501)

*   **Action:** Fixed drag-and-drop module placement from catalog to rack.
*   **Detail:**
    *   Fixed race condition in `rackStore.createRack()` - wasn't updating local config state immediately.
    *   Fixed `rackStore.loadConfig()` for same issue.
    *   Improved drag-leave handling in `WorkArea.tsx` using `dragCounter` ref to prevent premature reset.
    *   Added `onDragEnter` handler for proper drag state tracking.
*   **Outcome:** Success. Drag-and-drop from Module Catalog to Work Area now works correctly.
*   **Artifacts:**
    *   `apps/web/src/stores/rackStore.ts`
    *   `apps/web/src/components/layout/WorkArea.tsx`

### [2026-01-27] - Settings Dialog Implementation

*   **Action:** Implemented Settings dialog for application configuration.
*   **Detail:**
    *   Created reusable `Dialog` component with keyboard support (Escape to close).
    *   Created `SettingsDialog` with Display settings (channel numbers, raw values, animations) and Modbus info.
    *   Added dialog state management to `uiStore` (openSettingsDialog, closeSettingsDialog).
    *   Wired Tools > Settings menu item to open the dialog.
    *   Added `scale-in` animation to tailwind config for dialog entrance.
*   **Outcome:** Success. Settings dialog accessible via Tools > Settings (Ctrl+,).
*   **Artifacts:**
    *   `apps/web/src/components/common/Dialog.tsx`
    *   `apps/web/src/components/dialogs/SettingsDialog.tsx`
    *   `apps/web/src/stores/uiStore.ts`
    *   `apps/web/src/components/layout/AppShell.tsx`
    *   `apps/web/src/components/layout/MenuBar.tsx`
    *   `apps/web/tailwind.config.js`

### [2026-01-27] - File > Exit Permission Fix

*   **Action:** Added window close permission for File > Exit functionality.
*   **Detail:**
    *   Added `core:window:allow-close` to Tauri capabilities.
    *   Added error handling with fallback to `destroy()` in `closeApp()`.
*   **Outcome:** File > Exit should now work (requires Tauri restart).
*   **Artifacts:**
    *   `apps/web/src-tauri/capabilities/default.json`
    *   `apps/web/src/api/tauri.ts`

### [2026-01-27] - MVP Blocker Fixes (AI-ISSUE-2026012503, 04, 05)

*   **Action:** Fixed three MVP blocker issues in the UI shell.
*   **Detail:**
    *   **Status Bar (AI-ISSUE-2026012503):** Fixed type mismatch between backend `ConnectionState` and frontend types. Enhanced StatusBar to show "Clients Active" (green), "Listening" (yellow), or "Server Offline" (red).
    *   **Close Rack (AI-ISSUE-2026012504):** Fixed `clearRack()` to immediately clear local state (config, moduleStates) in addition to backend call.
    *   **Exit (AI-ISSUE-2026012505):** Verified File > Exit already exists and is wired to `tauriApi.closeApp` with Alt+F4 shortcut.
*   **Outcome:** Success. All three immediate MVP blockers resolved.
*   **Artifacts:**
    *   `packages/shared/src/types/rack.ts`
    *   `apps/web/src/stores/connectionStore.ts`
    *   `apps/web/src/stores/rackStore.ts`
    *   `apps/web/src/api/tauri.ts`
    *   `apps/web/src/components/layout/StatusBar.tsx`

### [2026-01-27] - Real-World Testing Validation

*   **Action:** Comprehensive real-world testing of simulator with actual Modbus clients.
*   **Detail:**
    *   Validated all module types against external Modbus clients.
    *   Corrected multiple process data image handling issues.
    *   Confirmed WAGO-compatible register layout and bit packing.
    *   All core simulation functionality verified working.
*   **Outcome:** Success. Simulator is functionally complete for MVP use cases.
*   **Next Steps:**
    *   ~~Wire status bar connection/client updates (AI-ISSUE-2026012503)~~ Done
    *   ~~Implement clearRack end-to-end (AI-ISSUE-2026012504)~~ Done
    *   ~~Add File > Exit menu item (AI-ISSUE-2026012505)~~ Already implemented
    *   Implement save/save-as/export flows
    *   Add Settings dialog

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