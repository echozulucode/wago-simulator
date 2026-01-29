# Reactive Scenario System + Force Overrides (v2) — Implementation Plan (Incorporating Improvements)

## Executive Summary

We will extend the simulator with a **YAML-driven reactive scenario system** and a **PLC-style force mechanism**, while adding the missing “production-grade” pieces:

- **Deterministic behavior evaluation** via a **dependency graph** (topological sort + cycle detection)
- Explicit **channel value ownership** (Default / Scenario / Manual / Force)
- **Strict YAML validation** with actionable errors surfaced to UI
- **Scenario lifecycle hooks** to prevent “ghost updates” during switching/reload
- Built-in **introspection/debug APIs** for reactive behaviors, delays, and overrides

---

## 0. Goals and Non-Goals

### Goals

1. YAML-based reactive scenarios defining continuous I/O relationships
2. Default reactive scenario auto-load on start
3. Runtime scenario switching (no restart)
4. Force overrides (inputs and outputs), highest priority
5. Clear GUI indication for forced/owned values
6. Deterministic and debuggable runtime behavior

### Non-Goals (MVP)

- Full expression language / DSL (placeholder only)
- High-fidelity analog dynamics (ramping/filters) beyond simple delay/scale stubs
- Persisting forces across restarts (optional enhancement)

---

## 1. Architecture Overview

### 1.1 Data Flow per Tick (Deterministic)

Every tick (e.g., 10ms), perform:

1. **Read Modbus outputs** (controller writes)
2. **Apply reactive scenario** (deterministic graph evaluation)
3. **Apply manual GUI actions** (record as Manual ownership)
4. **Apply force overrides** (Force ownership; absolute)
5. **Commit values** to process image
6. (Optional) emit debug telemetry snapshot

Key changes:

- “Manual overrides” are no longer a transient write that gets immediately overwritten;
  they have explicit ownership rules.

### 1.2 Ownership Model (Value Source)

Each channel maintains value + ownership metadata:

```rust
#[derive(Clone, Debug)]
pub enum ValueSource {
  Default,
  Scenario { scenario: String, behavior_id: Option<String> },
  Manual,
  Force,
}

#[derive(Clone, Debug)]
pub struct ChannelValue {
  pub value: f64,
  pub source: ValueSource,
  pub updated_at_tick: u64,
}
```

**Precedence (absolute):**
Force > Manual > Scenario > Default

**Policy on Force Clear:**

- When a force is cleared, the channel reverts to **next-highest** applicable ownership in the same tick (Manual if present, else Scenario, else Default).

---

## 2. YAML Schema (v2) + Validation

### 2.1 Reactive Scenario Schema

We keep the YAML structure but tighten semantics and reduce “permissive states”.

```yaml
scenarios:
  - name: 'Sunny Day'
    type: 'reactive'
    description: 'Normal operation feedback with realistic delays'
    default: true
    behaviors:
      - id: 'precharge_feedback'
        source: { module_position: 1, channel: 0 }
        target: { module_position: 0, channel: 1 }
        mapping: 'direct'
        delay_ms: 50
        enabled: true

      - id: 'l2_temp_good'
        target: { module_position: 0, channel: 4 }
        mapping: 'constant'
        value: 1.0
```

### 2.2 Validation Rules (Strict)

At load time, validate:

- Exactly **0 or 1 default** reactive scenario (warn if 0, error if >1)
- `mapping: direct|inverted|scaled` ⇒ `source` required
- `mapping: constant` ⇒ `value` required AND `source` must be absent
- `behavior.id` uniqueness within a scenario (warn or error; recommend error)
- `target` is required for all behaviors
- All referenced channels exist (module_position and channel range)
- Delay constraints: `delay_ms >= 0` and optionally `delay_ms <= MAX_DELAY_MS`
- Disallow conflicting fields (e.g., `constant: true` is removed; mapping defines type)

Validation returns a list of structured errors:

```rust
pub struct ValidationError {
  pub scenario: String,
  pub behavior_id: Option<String>,
  pub path: String,        // "scenarios[0].behaviors[2].source"
  pub message: String,
  pub severity: Severity,  // Error or Warning
}
```

UI should display errors in a toast + expandable panel.

---

## 3. Reactive Engine Runtime Model (Graph + Delays)

### 3.1 Behavior Graph

Build a graph of channel dependencies from behaviors:

- Node: ChannelRef (module_position, channel)
- Edge: source → target (for behaviors with a source)
- Constant behaviors have target nodes but no edge

At activation/load:

1. Build graph
2. Detect cycles
3. If cycle found:
   - MVP: **reject scenario** with clear error message
   - Future: allow cycles with explicit “latched”/stateful nodes

Topological sort:

- Evaluate behaviors in topo order to ensure deterministic application

### 3.2 Delay Model (State per Behavior) + Lifecycle

We adopt “state transition tracking” (Option B), but formalize it as per-behavior runtime state:

```rust
pub struct BehaviorRuntime {
  pub last_source_value: Option<f64>,
  pub last_change_tick: Option<u64>,
  pub pending_until_tick: Option<u64>,
  pub pending_value: Option<f64>,
}
```

Algorithm (per behavior):

- If source changes, schedule `pending_value` to apply at `now + delay_ticks`
- If no delay, apply immediately
- On scenario deactivate: clear all pending state (prevents ghost updates)

---

## 4. Scenario Lifecycle Hooks (Critical for Switching)

Introduce a runtime interface:

```rust
pub trait ReactiveScenarioRuntime {
  fn on_activate(&mut self, tick: u64);
  fn on_deactivate(&mut self, tick: u64);
  fn on_tick(&mut self, tick: u64);
}
```

Implementation:

- `on_activate`: build graph, allocate runtime state, clear pending queues
- `on_deactivate`: clear runtime state, clear pending updates, optional reset scenario-owned channels
- `on_tick`: evaluate behaviors in deterministic order

Scenario switching:

- Deactivate current runtime
- Activate new runtime
- Ensure **no delayed actions** survive the switch

---

## 5. Forces (Backend) + Ownership Integration

### 5.1 Force State

```rust
pub struct ChannelForce {
  pub enabled: bool,
  pub value: f64,
}

pub struct Simulator {
  // ...
  pub channel_forces: HashMap<(usize, u16), ChannelForce>,
}
```

### 5.2 Output Forces and Modbus Writes Policy

For forced outputs:

- Accept Modbus write, but treat it as “shadowed” (ignored for committed value)
- Record last Modbus write in debug state
- Optional: log warning once per channel per session

This avoids breaking clients that expect successful writes while still behaving like a forced PLC output.

---

## 6. Manual Overrides Policy (Make It Explicit)

Manual GUI input becomes a first-class ownership:

- When user toggles a channel, that channel gets `ValueSource::Manual`.
- Manual can be cleared per-channel or globally.
- Manual remains until:
  - user clears it, OR
  - scenario explicitly sets a “manual_timeout_ms” (future), OR
  - force overrides temporarily

This prevents “fighting” where scenario overwrites manual every tick.

---

## 7. Introspection / Debug Telemetry (MVP)

### 7.1 Debug State Structures

```rust
pub struct BehaviorDebug {
  pub scenario: String,
  pub behavior_id: Option<String>,
  pub enabled: bool,
  pub source: Option<ChannelRef>,
  pub target: ChannelRef,
  pub mapping: String,
  pub delay_ms: Option<u64>,
  pub last_source_value: Option<f64>,
  pub pending_until_tick: Option<u64>,
  pub last_applied_tick: Option<u64>,
  pub blocked_by: Option<String>, // e.g. "Force", "Manual"
}

pub struct ChannelDebug {
  pub channel: ChannelRef,
  pub value: f64,
  pub source: String, // Force/Manual/Scenario/Default
  pub forced: bool,
  pub manual: bool,
}
```

### 7.2 Tauri Commands (New)

- `get_reactive_debug_state()` -> Vec<BehaviorDebug>
- `get_channel_debug_state()` -> Vec<ChannelDebug>
- `get_forces()` -> Vec<ForceInfo>
- `get_manual_overrides()` -> Vec<ManualInfo> (optional MVP)

---

## 8. Implementation Phases (Revised)

## Phase 1 — Schema + Validation + Ownership Core (Backend) ✅ COMPLETE

**Goal:** Foundation that makes everything deterministic and debuggable.

Tasks:

- [x] Replace permissive behavior fields (remove `constant: bool`; use `mapping`)
- [x] Add `ChannelValue` + `ValueSource` to channel state
- [x] Implement strict YAML validation with structured errors
- [x] Add a `ScenarioManager` that can return validation errors to UI
- [x] Add basic APIs: `validate_config()` and include validation on load

Deliverables:

- YAML loads with validation warnings/errors ✅
- Channels expose ownership metadata to UI ✅

**Implementation Notes (2026-01-28):**
- Created `reactive.rs` module with `ValueSource`, `ChannelOwnership`, `ReactiveScenarioManager`
- Extended `ChannelState` with `source`, `forced`, `manual`, `scenarioBehaviorId` fields
- Added 7 unit tests for validation and ownership logic
- Added 13 Tauri commands for reactive scenarios, forces, manual overrides, and validation

---

## Phase 2 — Reactive Engine with Graph + Delays + Lifecycle (Backend) ✅ COMPLETE

**Goal:** Deterministic reactive evaluation.

Tasks:

- [x] Build dependency graph from behaviors
- [x] Implement cycle detection + topo sort
- [x] Implement `ReactiveScenarioRuntime` lifecycle hooks
- [x] Implement per-behavior delay runtime state
- [x] Ensure scenario switch clears pending delays
- [x] Apply scenario writes only if target isn't owned by Force/Manual

Deliverables:

- Stable deterministic behavior evaluation ✅
- No ghost updates on switch/reload ✅

**Implementation Notes (2026-01-28):**
- Created `DependencyGraph` with adjacency list representation
- Implemented cycle detection using DFS with node coloring (white/gray/black)
- Implemented topological sort using Kahn's algorithm
- Created `BehaviorRuntime` struct tracking per-behavior delay state
- Created `ReactiveScenarioRuntime` with on_activate/on_deactivate lifecycle hooks
- Integrated runtime evaluation into Simulator::tick()
- Added 9 new unit tests for Phase 2 (total 16 tests)
- Added `get_reactive_debug_state` command for introspection

---

## Phase 3 — Force Overrides Integrated with Ownership (Backend) ✅ COMPLETE

**Goal:** PLC-style forcing, absolute priority, clean unforce behavior.

Tasks:

- [x] Implement `channel_forces` store
- [x] Apply Force after Manual/Scenario and mark `ValueSource::Force`
- [x] Implement force commands:
  - set/clear/clear_all/get_forces

- [x] Implement "shadow modbus writes" for forced outputs (track last write)
- [x] Add forced flag + ownership in `ChannelState` model

Deliverables:

- Force works on any channel; reads reflect forced value ✅
- Clearing force reverts deterministically (Manual > Scenario > Default) ✅

**Implementation Notes (2026-01-28):**
- Extended `ChannelForce` with `shadow_value` and `shadow_write_tick` fields
- Added `ChannelForce::new()` constructor and `record_shadow_write()` method
- Added `get_forced_value()` and `record_shadow_write()` to ReactiveScenarioManager
- Updated `write_coils()` to check for forced channels before writing
- Updated `write_holding_registers()` to check for forced AO channels
- Shadow writes are recorded when Modbus clients try to write to forced channels
- Updated `ForceInfo` to include `shadowValue` for API responses
- Added 3 new unit tests for force/shadow functionality (total 19 tests)

---

## Phase 4 — Scenario Management + Switching + Default Loading (Backend) ✅ COMPLETE

**Goal:** Runtime selection with lifecycle correctness.

Tasks:

- [x] Auto-load default reactive scenario on start (validate uniqueness)
- [x] Add commands:
  - list_reactive_scenarios
  - load_reactive_scenario
  - disable_reactive_scenario
  - get_active_reactive_scenario

- [x] On switch:
  - deactivate old runtime
  - activate new runtime
  - clear pending delay states

- [x] Add validation for referenced channels against rack model

Deliverables:

- Hot switching is reliable and deterministic ✅

**Implementation Notes (2026-01-29):**
- Added `auto_activate_default()` method to ReactiveScenarioManager
- Updated `load_from_yaml_string()` to call `auto_activate_default()` after loading scenarios
- Scenario switching properly deactivates old runtime before activating new one
- Lifecycle hooks (on_activate, on_deactivate) clear pending delay states
- All commands were already implemented in Phase 1 - verified working
- Added 4 new unit tests for scenario management (total 23 tests)

---

## Phase 5 — Frontend UI: Force + Ownership Indicators (High Priority) ✅ PARTIAL

**Goal:** Trustworthy operator UX.

Tasks:

- [x] Add force controls per channel (checkbox + value input)
- [x] Add clear force / clear all forces actions (via right-click menu)
- [x] Show ownership badges:
  - Force (⚡) ✅
  - Manual (hand icon) - deferred
  - Scenario (gear icon) - deferred

- [ ] Tooltip shows who owns it and (if scenario) behavior_id
- [x] Zustand stores: forces + channel ownership
- [x] Sync forced list + ownership from backend at startup and periodically or via events

Deliverables:

- Clear forced/owned indication ✅
- Users understand why values are "stuck" ✅

**Implementation Notes (2026-01-29):**
- Created `forceStore.ts` with force state management and backend sync
- Created `ContextMenu` component for right-click actions
- Added force controls to RightPanel's ChannelOverride section
- Added force indicators (Zap icon, orange highlighting) to IOCard channel rows
- Added context menu with "Force ON", "Force OFF", "Clear Force" options
- Force state synced in rackStore's 10Hz poll loop
- Manual and Scenario badges deferred to later phase

---

## Phase 6 — Frontend UI: Scenario Selector + Debug Panel ✅ COMPLETE

**Goal:** Switching + introspection.

Tasks:

- [x] Reactive scenario dropdown (with Default badge)
- [x] "None" option
- [x] Add Debug panel (collapsible):
  - active behaviors
  - pending delays
  - blocked_by (Force/Manual)

- [x] Display validation errors on load and on scenario switch

Deliverables:

- Users can self-diagnose most "why isn't it changing?" issues ✅

**Implementation Notes (2026-01-29):**
- Created `reactiveScenarioStore.ts` for reactive scenario state management
- Added reactive scenario dropdown to Toolbar with Zap icon and Default badges
- Created `ReactiveDebugPanel` component with collapsible behavior list
- Shows validation errors, pending delays, and blocked-by status
- Integrated into RightPanel for easy access
- State sync added to rackStore's 10Hz poll loop

---

## Phase 7 — Testing & Validation

**Goal:** Prevent regressions and validate real client behavior.

Tasks:

- [ ] Unit tests:
  - cycle detection
  - topo order stability
  - delay behavior correctness
  - ownership precedence and force-clear reversion
  - YAML validation cases

- [ ] Integration tests with Modbus client:
  - forced outputs shadow writes
  - reads reflect committed values

- [ ] Playwright E2E:
  - force toggle + clear
  - scenario switch does not leak delayed updates
  - debug panel displays pending/blocked states

- [ ] Document user workflows + “ownership rules” section

Deliverables:

- Confidence for lab usage

---

## 9. Updated API Surface (Backend)

### Force

- `set_channel_force(module_position, channel, enabled, value)`
- `clear_channel_force(module_position, channel)`
- `clear_all_forces()`
- `get_forces() -> Vec<ForceInfo>`

### Manual Overrides (Recommended)

- `set_manual_override(module_position, channel, value)`
- `clear_manual_override(module_position, channel)`
- `clear_all_manual_overrides()`

### Reactive Scenarios

- `list_reactive_scenarios()`
- `load_reactive_scenario(name)`
- `disable_reactive_scenario()`
- `get_active_reactive_scenario()`

### Validation + Debug

- `get_validation_errors() -> Vec<ValidationError>`
- `get_reactive_debug_state() -> Vec<BehaviorDebug>`
- `get_channel_debug_state() -> Vec<ChannelDebug>`

---

## 10. Updated Success Criteria

- ✅ Deterministic reactive evaluation (graph + topo order)
- ✅ Cycle detection prevents invalid scenarios
- ✅ Strict YAML validation with actionable errors
- ✅ Channel ownership displayed and reliable
- ✅ Scenario switching does not leak delayed updates
- ✅ Force overrides absolute, and unforce reverts deterministically
- ✅ Introspection APIs make debugging practical
- ✅ Backward compatibility for scripted scenarios maintained

---

## 11. Revised Effort Estimate

|                                        Phase | Estimated Time | Notes                                             |
| -------------------------------------------: | -------------- | ------------------------------------------------- |
|              Phase 1: Ownership + Validation | 10–16 hrs      | Validation + UI surfacing drives time             |
| Phase 2: Reactive Graph + Delays + Lifecycle | 12–20 hrs      | Cycle detection + topo + runtime states           |
|                   Phase 3: Forces Integrated | 6–10 hrs       | Shadow writes + ownership                         |
|                  Phase 4: Scenario Switching | 4–8 hrs        | Lifecycle correctness                             |
|         Phase 5: Force UI + Ownership Badges | 8–14 hrs       | UX polish + sync                                  |
|     Phase 6: Scenario Selector + Debug Panel | 6–12 hrs       | Introspection UI                                  |
|                               Phase 7: Tests | 10–18 hrs      | Unit + E2E + Modbus integration                   |
|                                    **Total** | **56–98 hrs**  | MVP can be smaller; “trusted lab tool” needs more |

---

## 12. Open Questions (Updated)

1. Manual override semantics: should manual persist until cleared, or auto-expire?
2. Scenario switch behavior: should it clear manual overrides? clear forces? (recommend: do not clear by default)
3. Should scenario activation reset channels it previously owned, or leave last committed values?
4. How should analog channels be represented (float vs scaled int) for ownership + force value input?
5. Should cycle detection be error (block load) or warning (allow with defined iteration count)? (recommend: error)
