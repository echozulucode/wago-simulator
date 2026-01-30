# Reactive Scenario System

This document describes the WAGO 750 Simulator's reactive scenario system, including the ownership model, force overrides, and debugging tools.

## Overview

The reactive scenario system provides continuous, automatic I/O behaviors that respond to channel state changes. Unlike scripted scenarios (which execute time-based sequences), reactive scenarios define persistent relationships between channels that are evaluated every simulation tick.

## Channel Value Ownership Model

Every I/O channel has a value that can be set by multiple sources. The **ownership model** determines which source's value takes precedence using strict priority rules.

### Ownership Priority (Highest to Lowest)

| Priority | Source   | Description                                         |
|----------|----------|-----------------------------------------------------|
| 1        | **Force**    | PLC-style force override - absolute control     |
| 2        | **Manual**   | User-set value via GUI controls                 |
| 3        | **Scenario** | Value set by active reactive scenario behavior  |
| 4        | **Default**  | Initial/reset value (typically 0 or OFF)        |

### How Priority Works

- Higher priority sources **always** override lower priority sources
- When a higher-priority source is removed (e.g., force is cleared), the channel reverts to the next-highest active source
- Multiple sources can be "pending" simultaneously - only the highest priority is applied

**Example:**
1. Channel starts at Default (0.0)
2. Reactive scenario sets it to 1.0 → Channel shows 1.0 (Scenario)
3. User manually sets it to 2.0 → Channel shows 2.0 (Manual overrides Scenario)
4. User forces it to 3.0 → Channel shows 3.0 (Force overrides Manual)
5. User clears force → Channel shows 2.0 (reverts to Manual)
6. User clears manual → Channel shows 1.0 (reverts to Scenario)

## Force Overrides

Force overrides provide absolute control over any I/O channel, similar to forcing values in a PLC programming environment.

### Enabling Force

**Via Right Panel:**
1. Select a module by clicking it in the rack view
2. Click on a channel to select it
3. In the right panel, find the "Force Enable" toggle
4. Toggle it ON
5. For digital channels: Set the force value (HIGH/LOW)
6. For analog channels: Enter the numeric force value

**Via Context Menu:**
1. Right-click on any channel in the rack view
2. Select "Force ON" or "Force OFF" for digital channels
3. Select "Clear Force" to remove the force

### Force Indicators

- **Lightning bolt icon (⚡)**: Displayed on forced channel rows
- **Orange highlighting**: Forced channels have an orange background
- **"FORCED" badge**: Shown in the properties panel when a forced channel is selected

### Shadow Writes (Output Channels)

When an output channel is forced:
- Modbus client writes are **accepted** but **ignored** (the forced value is maintained)
- The "shadow value" (what the client tried to write) is recorded for debugging
- The debug panel shows both the forced value and the last shadow write

This behavior mimics real PLC forcing - clients don't receive errors, but their writes don't affect the output.

### Clearing Force

When force is cleared on a channel:
1. If a **Manual** value was set → channel reverts to manual value
2. Else if a **Scenario** is controlling the channel → channel reverts to scenario value
3. Else → channel reverts to **Default** value (0)

This deterministic reversion prevents unexpected behavior when forces are cleared.

## Reactive Scenarios

### YAML Schema

Reactive scenarios are defined in the YAML configuration file:

```yaml
reactive_scenarios:
  - name: 'Sunny Day'
    type: 'reactive'
    description: 'Normal operation with feedback'
    default: true
    behaviors:
      - id: 'precharge_feedback'
        source: { module_position: 1, channel: 0 }
        target: { module_position: 0, channel: 1 }
        mapping: 'direct'
        delay_ms: 50
        enabled: true

      - id: 'constant_ready_signal'
        target: { module_position: 0, channel: 5 }
        mapping: 'constant'
        value: 1.0
        enabled: true
```

### Behavior Types

| Mapping Type | Description | Required Fields |
|--------------|-------------|-----------------|
| `direct`     | Copies source value to target | `source` |
| `inverted`   | Inverts source (0↔1) | `source` |
| `scaled`     | Multiplies source by scale factor | `source` |
| `constant`   | Sets target to a fixed value | `value` |

### Default Scenario

- Mark one scenario with `default: true` to auto-load it when the configuration is opened
- Only one scenario can be the default (validation error if multiple)
- If no default is specified, no scenario is auto-activated

### Switching Scenarios

**Via Toolbar:**
1. Click the reactive scenario dropdown (shows "Reactive: [Name]" or "Reactive: None")
2. Select a scenario from the list, or select "None (Disabled)"

**What happens on switch:**
- Current scenario is deactivated
- All pending delayed values are **discarded** (no "ghost updates")
- New scenario is activated
- New scenario begins evaluating immediately
- Forces and manual overrides are **preserved** (not cleared)

## Delayed Behaviors

Behaviors can have a `delay_ms` property that introduces a time delay before the target is updated:

```yaml
- id: 'slow_relay'
  source: { module_position: 0, channel: 0 }
  target: { module_position: 1, channel: 0 }
  mapping: 'direct'
  delay_ms: 500  # 500ms delay
```

### How Delays Work

1. When source changes, the new value is **scheduled** to apply after the delay
2. During the delay, the target maintains its previous value
3. After delay expires, the target updates to the new value
4. If source changes again during delay, the pending value is **updated** (not queued)

### Delay Cancellation

Pending delayed values are cleared when:
- The scenario is deactivated
- A different scenario is activated
- The simulation is stopped

This prevents "ghost updates" where old delayed values would apply after scenario changes.

## Debug Panel

The Reactive Debug panel (in the right panel) provides real-time visibility into the reactive system.

### Information Displayed

**Header Badges:**
- Error count (red) - validation errors
- Warning count (yellow) - validation warnings
- Pending count (blue) - behaviors waiting for delay
- Blocked count (red) - behaviors blocked by Force/Manual

**Validation Issues Section:**
- Lists all validation errors and warnings
- Shows scenario name, behavior ID, and specific error message
- Shows JSON path to the problematic field

**Active Behaviors Section:**
- Lists all behaviors in the active scenario
- For each behavior shows:
  - Behavior ID
  - Source → Target channel mapping
  - Mapping type
  - Delay (if configured)
  - Last source value
  - Pending value (if waiting for delay)
  - Blocked status (if blocked by Force/Manual)

### Using Debug Panel for Troubleshooting

**"Why isn't my channel changing?"**
1. Check if the channel is forced (look for Force indicator)
2. Check if a manual override is active
3. Open the debug panel and look for "blocked_by" on the behavior

**"Why is the value wrong?"**
1. Check the ownership - which source is active?
2. Look at "Last Source Value" in the debug panel
3. Verify the mapping type is correct

**"Values seem delayed/laggy"**
1. Check if the behavior has a delay_ms configured
2. Look for "Pending" badges in the debug panel
3. Verify the simulation tick rate

## Validation

The system validates scenarios when the configuration is loaded:

### Validation Rules

| Rule | Severity | Message |
|------|----------|---------|
| Duplicate behavior IDs | Error | "Duplicate behavior ID: {id}" |
| Missing source for direct/inverted/scaled | Error | "requires a 'source' field" |
| Missing value for constant | Error | "requires a 'value' field" |
| Channel out of range | Error | "channel {n} out of range" |
| Module position out of range | Error | "module_position {n} out of range" |
| Multiple default scenarios | Error | "Multiple default scenarios" |
| Circular dependencies | Error | "Cycle detected: A → B → A" |
| No default scenario | Warning | "No default reactive scenario" |

### Cycle Detection

The system automatically detects circular dependencies in behaviors:

```yaml
# Invalid - creates a cycle
behaviors:
  - id: 'a_to_b'
    source: { module_position: 0, channel: 0 }
    target: { module_position: 0, channel: 1 }  # A → B
    mapping: 'direct'
  - id: 'b_to_a'
    source: { module_position: 0, channel: 1 }
    target: { module_position: 0, channel: 0 }  # B → A (creates cycle!)
    mapping: 'direct'
```

Scenarios with cycles are rejected with a clear error message indicating the cycle path.

## API Reference

### Tauri Commands

| Command | Description |
|---------|-------------|
| `list_reactive_scenarios()` | Get list of available scenarios |
| `load_reactive_scenario(name)` | Activate a scenario by name |
| `disable_reactive_scenario()` | Deactivate current scenario |
| `get_active_reactive_scenario()` | Get info about active scenario |
| `set_channel_force(module, channel, value)` | Force a channel to a value |
| `clear_channel_force(module, channel)` | Clear force on a channel |
| `clear_all_forces()` | Clear all forces |
| `get_forces()` | Get list of all forced channels |
| `get_validation_errors()` | Get validation issues |
| `get_reactive_debug_state()` | Get behavior debug info |

### TypeScript Types

```typescript
interface ReactiveScenarioInfo {
  name: string;
  description?: string;
  isDefault: boolean;
  behaviorCount: number;
}

interface ForceInfo {
  modulePosition: number;
  channel: number;
  value: number;
  shadowValue?: number;  // Last Modbus write (if output)
}

interface BehaviorDebug {
  scenario: string;
  behaviorId: string;
  enabled: boolean;
  sourceModule?: number;
  sourceChannel?: number;
  targetModule: number;
  targetChannel: number;
  mapping: string;
  delayMs: number;
  lastSourceValue?: number;
  pendingUntilTick?: number;
  pendingValue?: number;
  blockedBy?: string;  // "Force" | "Manual" | undefined
}
```

## Best Practices

1. **Use descriptive behavior IDs** - Makes debugging easier
2. **Keep scenarios focused** - One scenario per use case
3. **Test with forces** - Verify your PLC code handles forced values correctly
4. **Use delays sparingly** - Long delays can make debugging harder
5. **Check validation errors** - Fix all errors before relying on scenarios
6. **Document your scenarios** - Use the description field
