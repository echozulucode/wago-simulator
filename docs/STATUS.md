# Project Status: WAGO 750 Simulator

Last Updated: 2026-01-24

## I. Current Context (The "State")

*   **Active Sprint/Phase:** Phase 2: Core Simulation Engine (Complete) -> Phase 3: UI Visualization
*   **Current Objective:** Verify Modbus TCP server runtime functionality with Watchdog and Metadata support.
*   **Current Blockers:** None.
*   **Active Working Files:**
    *   `apps/web/src-tauri/src/server.rs`
    *   `apps/web/src-tauri/src/state.rs`
    *   `apps/web/src-tauri/src/lib.rs`

## II. Execution Log (The "Ledger")

Rule: New entries are added to the TOP of this list (Reverse Chronological).

### [2026-01-24] - Implemented WAGO Process Model Features

*   **Action:** Updated Rust backend to support WAGO-specific Modbus features.
    *   **Metadata Registers (0x2000+):** Implemented `read_special_input_registers` in `state.rs` to return firmware version and module suffixes (e.g. `1405` for `750-1405`) at `0x2030+`.
    *   **Watchdog (0x1000):** Implemented watchdog logic. Writing to `0x1000` sets timeout. Background task in `lib.rs` checks timeout and zeros Digital Outputs if expired.
    *   **Modbus Server Fix:** Corrected `server.serve` implementation in `server.rs` using `(Service, Stream)` tuple return.
*   **Outcome:** Success. Backend compiles and implements key WAGO behaviors.
*   **Artifacts:** `apps/web/src-tauri/src/{server.rs, state.rs, lib.rs}`

### [2026-01-24] - Enabled Modbus TCP Server

*   **Action:** Fixed `tokio-modbus` v0.17 `server.serve` implementation in `server.rs`.
    *   Identified correct closure signature: `(Service, Stream)`.
    *   Uncommented connection logic.
    *   Verified compilation with `cargo check`.
*   **Outcome:** Success. Backend now compiles with full Modbus TCP server capabilities enabled.
*   **Artifacts:** `apps/web/src-tauri/src/server.rs`

### [2026-01-24] - UI Polish & Module Width Adjustment

*   **Action:** Increased width of `IOCard` to `w-24` and `CouplerCard` to `w-32`.
*   **Outcome:** Success. Text labels ("OFF", IP addresses) now fit comfortably within module visuals.
*   **Verification:** Playwright E2E tests passed (`pnpm test:e2e`).

### [2026-01-24] - E2E Test Stabilization

*   **Action:** Fixed Playwright test failures in `rack-builder` and `io-controls` suites.
*   **Outcome:** Success. All 32 E2E tests passed.

### [2026-01-24] - Rust/Tauri Backend Migration

*   **Action:** Ported "The Brain" from Node.js to Rust (`src-tauri`).
*   **Outcome:** Success. Application architecture successfully migrated to Rust+React hybrid.
