# Scenario System Implementation Plan

## Executive Summary

The **Scenario System** enables automated control of the WAGO 750 Simulator's I/O state over time. This feature is critical for:
1.  **Automated Testing:** Verifying SCADA/PLC logic against known I/O sequences.
2.  **Demonstrations:** Creating repeatable, complex I/O patterns for showcasing functionality.
3.  **Training:** Simulating fault conditions or specific process behaviors.

This document outlines the architecture, data model, and phased implementation plan for the Scenario System.

## 1. Architecture

The system follows a "Backend-Driven" architecture where the Rust backend executes the scenario logic to ensure timing precision, while the Frontend serves as the editor and control interface.

### 1.1 Data Model (JSON Schema)

Scenarios are stored as JSON files. The structure is designed to be human-readable and easily generated.

```typescript
interface Scenario {
  name: string;          // Display name
  description?: string;  // Optional description
  version: "1.0";        // Schema version
  loop: boolean;         // Whether to restart after the last step
  steps: ScenarioStep[];
}

interface ScenarioStep {
  // Trigger condition (relative time from start of scenario)
  timeOffsetMs: number;
  
  // Target
  modulePosition: number; // 0-based index of module in rack
  channel: number;        // 0-based channel index
  
  // Action
  action: 'set' | 'ramp' | 'pulse';
  
  // Parameters
  value: number | boolean; // Target value
  
  // For 'ramp' and 'pulse'
  durationMs?: number;     // How long the ramp/pulse lasts
  endValue?: number;       // For ramp: start at current, go to endValue? Or value -> endValue?
                           // SIMPLIFICATION: 'value' is target. For ramp, it interpolates from CURRENT value to TARGET 'value' over 'durationMs'.
}
```

**Example: `pump_failure.json`**
```json
{
  "name": "Pump Failure Simulation",
  "description": "Simulates normal operation followed by a pressure spike and trip.",
  "version": "1.0",
  "loop": false,
  "steps": [
    { "timeOffsetMs": 0,    "modulePosition": 0, "channel": 0, "action": "set", "value": true },  // Pump Start
    { "timeOffsetMs": 1000, "modulePosition": 1, "channel": 0, "action": "ramp", "value": 85.0, "durationMs": 5000 }, // Pressure ramp up
    { "timeOffsetMs": 6000, "modulePosition": 1, "channel": 0, "action": "set", "value": 110.0 }, // Pressure Spike
    { "timeOffsetMs": 6500, "modulePosition": 0, "channel": 0, "action": "set", "value": false }  // Pump Trip
  ]
}
```

### 1.2 Backend (Rust)

A new `ScenarioEngine` struct will be integrated into the main `Simulator`.

**Struct: `ScenarioEngine`**
*   **State:**
    *   `running`: boolean
    *   `start_time`: Instant
    *   `current_step_index`: usize
    *   `active_ramps`: List of active interpolations
    *   `loaded_scenario`: Option<Scenario>
*   **Methods:**
    *   `load_scenario(json: String) -> Result<()>`
    *   `play()`
    *   `pause()`
    *   `stop()`
    *   `tick(current_time: Instant, rack_state: &mut RackState)`

**Integration:**
Inside `Simulator::update()` (the main loop), we invoke `scenario_engine.tick()`. This function checks `timeOffsetMs` against elapsed time and applies changes to the `RackState`.

### 1.3 Frontend (React)

*   **Store:** `scenarioStore` (Zustand) to track:
    *   Loaded scenario name
    *   Playback state (playing, paused, stopped)
    *   Current progress (time/step)
*   **Components:**
    *   `ScenarioControls`: Play/Pause/Stop buttons, progress bar.
    *   `ScenarioLoader`: File picker to load JSON.
    *   `SimulationMenu`: "Load Scenario..." action.

---

## 2. Implementation Phases

### Phase 1: Backend Core (Engine & Parsing)
**Goal:** Ability to load a JSON file and execute simple 'set' commands.

1.  **Define Rust Structs:** Create `models/scenario.rs` with Serde-compatible structs.
2.  **Implement Engine:** Create `scenario_engine.rs` with `load`, `play`, `stop`, `tick`.
3.  **Integrate:** Add `ScenarioEngine` field to `Simulator` struct in `lib.rs` / `state.rs`.
4.  **Tauri Commands:** Expose `load_scenario`, `start_scenario`, `stop_scenario`.
5.  **Unit Tests:** Test loading JSON and step execution logic in Rust.

### Phase 2: Advanced Actions (Ramp & Pulse)
**Goal:** Support complex analog behaviors.

1.  **Ramp Logic:** Implement linear interpolation in `tick()`. The engine needs to track "active ramps" that update the value every tick until duration expires.
2.  **Pulse Logic:** Implement temporary value sets that revert after `durationMs`.
3.  **Looping:** Implement the `loop: true` logic (reset start time when last step completes).

### Phase 3: Frontend Integration
**Goal:** User can load and control scenarios from the UI.

1.  **API Layer:** Add `tauri.ts` wrappers for scenario commands.
2.  **Store:** Create `scenarioStore.ts`.
3.  **UI Controls:** Add "Simulation > Load Scenario..." menu item.
4.  **Status Display:** Add a simple "Scenario: [Name] - [00:12 / 00:45]" display in the Toolbar or Status Bar.

### Phase 4: Scenario Editor (Post-MVP / Optional)
**Goal:** Create scenarios within the app.

1.  **Editor UI:** A list-based editor to add steps.
2.  **Save:** Export current scenario to JSON.

---

## 3. Detailed Tasks

### 3.1 Backend Tasks
- [ ] Create `apps/web/src-tauri/src/scenario.rs` module.
- [ ] Define `Scenario`, `ScenarioStep`, `Action` structs with `#[derive(Deserialize, Clone, Debug)]`.
- [ ] Implement `ScenarioEngine` struct.
- [ ] Add `scenario_engine` to `Simulator` struct.
- [ ] Update `Simulator::run` loop to call `self.scenario_engine.tick()`.
- [ ] Implement `tick` logic:
    - [ ] Calculate elapsed time.
    - [ ] Find pending steps where `step.time <= elapsed`.
    - [ ] Apply changes to `RackState`.
    - [ ] Increment `current_step_index`.
- [ ] Register new Tauri commands in `lib.rs` and `main.rs`.

### 3.2 Frontend Tasks
- [ ] Update `Simulation` menu in `MenuBar.tsx` with "Load Scenario...".
- [ ] Create `useScenarioStore` in `stores/scenarioStore.ts`.
- [ ] Update `Toolbar.tsx` to show Scenario controls when a scenario is active.
- [ ] Add file open dialog filter for `*.json`.

## 4. Technical Considerations

*   **Concurrency:** The `Simulator` is wrapped in `Arc<Mutex<>>`. The scenario engine needs mutable access to `RackState` during the tick. This is already handled by the current loop structure (which locks the simulator for the update cycle).
*   **Time Synchronization:** Use `std::time::Instant` for monotonic time tracking in Rust to avoid issues with system clock changes.
*   **Validation:** When loading a scenario, validate that `modulePosition` exists in the current rack configuration. If a module is missing, return a descriptive error.
*   **Conflict Resolution:** Manual overrides (clicking a switch) during a scenario should take precedence *momentarily*, but the scenario might overwrite it on the next step. (Standard behavior: Last command wins).

## 5. API Definition (Tauri Commands)

```rust
#[tauri::command]
fn load_scenario(
    state: State<SimulatorState>,
    path: String
) -> Result<ScenarioInfo, String>;

#[tauri::command]
fn control_scenario(
    state: State<SimulatorState>,
    command: String // "play", "pause", "stop"
) -> Result<(), String>;

#[tauri::command]
fn get_scenario_status(
    state: State<SimulatorState>
) -> ScenarioStatus; // { active: bool, name: String, time: u64, total_time: u64 }
```
