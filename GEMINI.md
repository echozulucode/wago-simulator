# WAGO 750 Simulator

## Project Overview

The **WAGO 750 Simulator** is a cross-platform desktop application designed to simulate WAGO 750 series I/O modules and Modbus TCP communication. It allows developers to test embedded controllers and SCADA systems without physical hardware.

The project recently underwent a major architectural migration from a Node.js backend to a **Rust + Tauri** architecture.

### Tech Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Zustand (State Management).
*   **Backend:** Rust (Tauri), Tokio (Async Runtime), `tokio-modbus` (Modbus TCP).
*   **Bridge:** Tauri IPC (`invoke` commands) connects the React frontend to the Rust backend.
*   **Testing:** Playwright (E2E), Vitest (Unit).

### Architecture

1.  **Rust Backend ("The Brain"):**
    *   Maintains the "Source of Truth" for the rack configuration and I/O state.
    *   Located in `apps/web/src-tauri`.
    *   Manages the simulation loop and Modbus TCP server.
    *   State is held in `Arc<Mutex<Simulator>>`.

2.  **React Frontend ("The Face"):**
    *   Visualizes the rack and I/O modules.
    *   Located in `apps/web/src`.
    *   Syncs state from the backend via polling (`get_rack_state`).
    *   Sends user actions (e.g., "Create Rack", "Toggle Switch") via Tauri Commands.

3.  **Shared Types:**
    *   TypeScript interfaces in `packages/shared`.
    *   Mirrored Rust structs in `apps/web/src-tauri/src/models.rs`.

## Building and Running

### Prerequisites
*   Node.js 18+
*   pnpm 8+
*   Rust (latest stable)

### Key Commands

Run these commands from the project root or the specified directory:

*   **Start Development App:**
    ```bash
    cd apps/web
    pnpm tauri dev
    ```
    *This starts the Vite dev server and the Tauri Rust backend application.*

*   **Run E2E Tests (Browser-only):**
    ```bash
    pnpm test:e2e
    ```
    *Runs Playwright tests using a mock backend implementation (`src/mocks/tauriMock.ts`) to verify UI logic without compiling Rust.*

*   **Build Production App:**
    ```bash
    cd apps/web
    pnpm tauri build
    ```

*   **Check Rust Code:**
    ```bash
    cd apps/web/src-tauri
    cargo check
    ```

## Development Conventions

*   **State Synchronization:** The frontend store (`rackStore.ts`) initializes a polling loop (`init()`) that fetches the full rack state from the Rust backend every 100ms.
*   **Mocking:** For E2E tests (`test:e2e`), the application detects it is running in a standard browser environment (where `window.__TAURI_INTERNALS__` is missing) and switches to `mockInvoke` (`apps/web/src/mocks/tauriMock.ts`).
*   **Modbus Server Status:** The Modbus TCP server implementation resides in `apps/web/src-tauri/src/server.rs`.
    *   **Note:** The actual TCP connection logic (`tokio_modbus::server::tcp::attach`) is currently **commented out** to ensure compilation while waiting for API adjustments compatible with `tokio-modbus` v0.17.
*   **Module Widths:** UI components (`IOCard`, `CouplerCard`) have fixed widths (`w-24`, `w-32`) to accommodate text labels.

## Directory Structure Key

*   `apps/web/src-tauri`: The Rust backend code.
    *   `src/lib.rs`: Defines Tauri commands and app entry point.
    *   `src/server.rs`: Modbus TCP server logic.
    *   `src/state.rs`: In-memory simulation state.
    *   `src/modules.rs`: Logic for individual I/O modules (DI, DO, AI, RTD).
*   `apps/web/src`: The React frontend code.
    *   `api/tauri.ts`: Wrapper for Tauri `invoke` calls (handles mocking).
    *   `stores/rackStore.ts`: Frontend state management.
    *   `components/rack`: Visualization components.
*   `docs/STATUS.md`: The "Living Status Ledger" tracking active development context.
