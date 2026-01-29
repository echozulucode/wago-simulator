# Project Status: WAGO 750 Simulator

Last Updated: 2026-01-29

## I. Current Context (The "State")

*   **Active Sprint/Phase:** Phase 6: Reactive Scenario System - Scenario Selector + Debug Panel
*   **Current Objective:** Implement scenario selector dropdown and debug introspection panel.
*   **Current Blockers:** None.
*   **Active Working Files:**
    *   `apps/web/src/components/layout/Toolbar.tsx`
    *   `apps/web/src/components/debug/ReactiveDebugPanel.tsx`
    *   `apps/web/src/stores/reactiveScenarioStore.ts`

## II. Execution Log (The "Ledger")

Rule: New entries are added to the TOP of this list (Reverse Chronological).

### [2026-01-29] - Reactive Scenario System Phase 6: Scenario Selector + Debug Panel

*   **Action:** Implemented frontend UI for reactive scenario selection and debug introspection.
*   **Detail:**
    *   **Reactive Scenario Store:** Created `reactiveScenarioStore.ts` Zustand store for scenario list, active scenario, validation errors, and debug state.
    *   **Toolbar Dropdown:** Added reactive scenario dropdown to Toolbar with Zap icon, "Default" badge, and "None" option.
    *   **Active Indicator:** Shows behavior count badge when a reactive scenario is active.
    *   **Debug Panel:** Created collapsible `ReactiveDebugPanel` component in RightPanel showing:
        - Validation errors and warnings with severity badges
        - Active behaviors with source/target mapping
        - Pending delay state visualization
        - Blocked-by indicators (Force/Manual)
    *   **State Sync:** Integrated reactive scenario state into rackStore sync loop.
    *   **UI Store:** Added `reactiveDebugExpanded` state and toggle action.
*   **Outcome:** Success. Users can now select reactive scenarios and view real-time debug state.
*   **Artifacts:**
    *   `apps/web/src/stores/reactiveScenarioStore.ts` (new)
    *   `apps/web/src/components/debug/ReactiveDebugPanel.tsx` (new)
    *   `apps/web/src/components/layout/Toolbar.tsx` (reactive scenario dropdown)
    *   `apps/web/src/components/layout/RightPanel.tsx` (debug panel integration)
    *   `apps/web/src/stores/uiStore.ts` (debug panel state)
    *   `apps/web/src/stores/rackStore.ts` (reactive sync integration)

### [2026-01-29] - Reactive Scenario System Phase 4: Scenario Management + Auto-Load

*   **Action:** Implemented Phase 4 - scenario management with auto-load and proper lifecycle.
*   **Detail:**
    *   **Auto-Activate Default:** Added `auto_activate_default()` method that finds and activates the default scenario with its runtime.
    *   **Config Load Integration:** Updated `load_from_yaml_string()` to auto-activate default scenario after loading.
    *   **Scenario Switching:** Verified that switching scenarios properly deactivates old runtime and activates new one.
    *   **Lifecycle Correctness:** on_activate/on_deactivate hooks clear pending delay states to prevent ghost updates.
    *   **Validation:** Channel reference validation against rack model already implemented in Phase 1.
*   **Outcome:** Success. Phase 4 complete with 23 passing unit tests (4 new tests).
*   **Artifacts:**
    *   `apps/web/src-tauri/src/reactive.rs` (auto_activate_default method)
    *   `apps/web/src-tauri/src/state.rs` (auto-activate call in load_from_yaml_string)

### [2026-01-29] - Reactive Scenario System Phase 5: Force Controls UI

*   **Action:** Implemented frontend UI for force override controls per user request.
*   **Detail:**
    *   **Force Store:** Created `forceStore.ts` Zustand store to manage force state and sync with backend.
    *   **Right Panel Controls:** Added force enable toggle and force value toggle to ChannelOverride in RightPanel.
    *   **Visual Indicators:** Force-enabled channels show orange highlighting, Zap icon, and "FORCED" badge.
    *   **Context Menu:** Added right-click context menu on channel rows with "Force ON", "Force OFF", "Clear Force" options.
    *   **Context Menu Component:** Created reusable `ContextMenu` component with keyboard support.
    *   **State Sync:** Added force state polling in rackStore's sync loop.
    *   **Disabled Controls:** Normal value controls are disabled when a channel is forced.
*   **Outcome:** Success. Force controls accessible via right panel toggles and right-click menu.
*   **Artifacts:**
    *   `apps/web/src/stores/forceStore.ts` (new)
    *   `apps/web/src/components/common/ContextMenu.tsx` (new)
    *   `apps/web/src/components/layout/RightPanel.tsx` (force controls in ChannelOverride)
    *   `apps/web/src/components/rack/IOCard.tsx` (context menu, force indicators)
    *   `apps/web/src/components/rack/RackView.tsx` (modulePosition prop)
    *   `apps/web/src/stores/rackStore.ts` (force sync in poll loop)

### [2026-01-28] - Reactive Scenario System Phase 3: Force Overrides with Shadow Writes

*   **Action:** Implemented Phase 3 of the reactive scenario system - force overrides with shadow Modbus write tracking.
*   **Detail:**
    *   **Shadow Write Tracking:** Extended `ChannelForce` with `shadow_value` and `shadow_write_tick` fields.
    *   **Shadow Recording:** Added `record_shadow_write()` method to capture Modbus writes while channel is forced.
    *   **Coil Write Integration:** Updated `write_coils()` to check for forced channels and record shadow values.
    *   **Holding Register Integration:** Updated `write_holding_registers()` to check forced AO channels and record shadows.
    *   **API Enhancement:** Added `shadowValue` to `ForceInfo` response for debugging/UI display.
    *   **Deterministic Clear:** Force clearing reverts to Manual > Scenario > Default as per ownership model.
*   **Outcome:** Success. Phase 3 complete with 19 passing unit tests (3 new tests).
*   **Next Steps (Phase 4):**
    *   Auto-load default reactive scenario on start
    *   Implement hot scenario switching with lifecycle correctness
*   **Artifacts:**
    *   `apps/web/src-tauri/src/reactive.rs` (ChannelForce shadow fields, record_shadow_write)
    *   `apps/web/src-tauri/src/state.rs` (write_coils, write_holding_registers force checking)
    *   `packages/shared/src/types/reactive.ts` (ForceInfo.shadowValue)

### [2026-01-28] - Reactive Scenario System Phase 2: Graph + Delays + Lifecycle

*   **Action:** Implemented Phase 2 of the reactive scenario system - deterministic evaluation engine.
*   **Detail:**
    *   **Dependency Graph:** Built adjacency list representation from behavior source/target relationships.
    *   **Cycle Detection:** Implemented DFS with node coloring (white/gray/black) to detect dependency cycles.
    *   **Topological Sort:** Implemented Kahn's algorithm for deterministic evaluation order.
    *   **BehaviorRuntime:** Per-behavior state tracking (last_source_value, pending_until_tick, pending_value).
    *   **ReactiveScenarioRuntime:** Lifecycle hooks (on_activate, on_deactivate) that clear pending state.
    *   **Delay Handling:** Behaviors with delay_ms schedule values to apply after specified ticks.
    *   **Ownership Enforcement:** Scenario writes blocked if target has Force or Manual override.
    *   **Tick Integration:** Reactive evaluation runs each simulator tick, applying values to modules.
    *   **Debug Introspection:** Added `get_reactive_debug_state` command showing behavior states.
*   **Outcome:** Success. Phase 2 complete with 16 passing unit tests (9 new tests).
*   **Next Steps (Phase 3):**
    *   Implement shadow Modbus writes for forced outputs
    *   Track last Modbus write value for debugging
*   **Artifacts:**
    *   `apps/web/src-tauri/src/reactive.rs` (DependencyGraph, BehaviorRuntime, ReactiveScenarioRuntime)
    *   `apps/web/src-tauri/src/state.rs` (tick integration, evaluate_reactive_scenario helper)
    *   `apps/web/src-tauri/src/lib.rs` (get_reactive_debug_state command)
    *   `packages/shared/src/types/reactive.ts` (BehaviorDebug type)
    *   `apps/web/src/api/tauri.ts` (getReactiveDebugState method)

### [2026-01-28] - Reactive Scenario System Phase 1: Schema + Validation + Ownership Core

*   **Action:** Implemented Phase 1 of the reactive scenario system per `docs/ai/plans/reactive-scenario-system-plan.md`.
*   **Detail:**
    *   **Ownership Model:** Added `ValueSource` enum (Default, Scenario, Manual, Force) with clear precedence rules.
    *   **Channel State Enhancement:** Extended `ChannelState` with `source`, `forced`, `manual`, and `scenarioBehaviorId` fields.
    *   **Reactive Scenario Schema:** Created new YAML schema for continuous I/O behaviors with `mapping` types (direct, inverted, scaled, constant).
    *   **Validation:** Implemented strict YAML validation with structured errors (duplicate IDs, missing source/value, channel bounds, multiple defaults).
    *   **ReactiveScenarioManager:** New manager class handling scenario loading, validation, force overrides, and manual overrides.
    *   **Tauri Commands:** Added 13 new commands for reactive scenarios, forces, manual overrides, and validation.
    *   **TypeScript Types:** Added frontend types for reactive scenarios, forces, and validation errors.
    *   **Example Config:** Updated `test_rack.yaml` with example `reactive_scenarios` section.
*   **Outcome:** Success. Phase 1 foundation complete with 7 passing unit tests.
*   **Artifacts:**
    *   `apps/web/src-tauri/src/reactive.rs` (new module)
    *   `apps/web/src-tauri/src/state.rs` (ReactiveScenarioManager integration)
    *   `apps/web/src-tauri/src/models.rs` (ChannelState ownership fields)
    *   `apps/web/src-tauri/src/lib.rs` (13 new Tauri commands)
    *   `apps/web/src-tauri/src/sim_config.rs` (reactive_scenarios field)
    *   `packages/shared/src/types/reactive.ts` (new types)
    *   `packages/shared/src/types/modules.ts` (ValueSource type)
    *   `apps/web/src/api/tauri.ts` (new API methods)
    *   `test_rack.yaml` (example reactive scenarios)

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