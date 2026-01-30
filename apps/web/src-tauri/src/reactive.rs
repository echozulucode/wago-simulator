// Reactive Scenario System - Phase 1 & 2: Schema, Validation, Ownership, and Runtime
//
// This module implements continuous I/O relationship behaviors (distinct from
// the scripted ScenarioEngine which handles step-by-step actions).
//
// Phase 1: Schema, validation, ownership model
// Phase 2: Dependency graph, cycle detection, topological sort, runtime with delays

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

// ============================================================================
// Ownership Model
// ============================================================================

/// Identifies who/what set a channel's current value.
/// Precedence (highest to lowest): Force > Manual > Scenario > Default
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ValueSource {
    /// Initial/default value (lowest priority)
    Default,
    /// Set by a reactive scenario behavior
    Scenario {
        scenario_name: String,
        behavior_id: Option<String>,
    },
    /// Manually set via GUI (overrides scenario)
    Manual,
    /// Force override (highest priority, like PLC forcing)
    Force,
}

impl Default for ValueSource {
    fn default() -> Self {
        ValueSource::Default
    }
}

impl ValueSource {
    /// Returns the priority level (higher = takes precedence)
    pub fn priority(&self) -> u8 {
        match self {
            ValueSource::Default => 0,
            ValueSource::Scenario { .. } => 1,
            ValueSource::Manual => 2,
            ValueSource::Force => 3,
        }
    }
}

/// Channel value with ownership metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedValue {
    pub value: f64,
    pub source: ValueSource,
    pub updated_at_tick: u64,
}

impl Default for OwnedValue {
    fn default() -> Self {
        Self {
            value: 0.0,
            source: ValueSource::Default,
            updated_at_tick: 0,
        }
    }
}

// ============================================================================
// Channel Reference
// ============================================================================

/// Reference to a specific channel on a module
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelRef {
    pub module_position: usize,
    pub channel: u16,
}

impl ChannelRef {
    pub fn new(module_position: usize, channel: u16) -> Self {
        Self { module_position, channel }
    }
}

// ============================================================================
// Behavior Mapping Types
// ============================================================================

/// How source values are transformed to target values
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase", tag = "type")]
pub enum BehaviorMapping {
    /// target = source
    Direct,
    /// target = 1.0 - source (for boolean inversion)
    Inverted,
    /// target = source * scale + offset
    Scaled { scale: f64, offset: f64 },
    /// target = constant value (no source needed)
    Constant { value: f64 },
}

impl Default for BehaviorMapping {
    fn default() -> Self {
        BehaviorMapping::Direct
    }
}

// ============================================================================
// Reactive Behavior Definition (YAML Schema)
// ============================================================================

/// A single reactive behavior that continuously maps source to target
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactiveBehavior {
    /// Unique identifier within the scenario (required for debugging)
    pub id: String,

    /// Source channel (required for direct/inverted/scaled, absent for constant)
    #[serde(default)]
    pub source: Option<ChannelRef>,

    /// Target channel (always required)
    pub target: ChannelRef,

    /// How to transform source to target
    #[serde(default)]
    pub mapping: BehaviorMappingYaml,

    /// Delay in milliseconds before applying changes
    #[serde(default)]
    pub delay_ms: u64,

    /// Whether this behavior is currently active
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Constant value (for backward compatibility with older schema)
    #[serde(default)]
    pub value: Option<f64>,
}

fn default_true() -> bool {
    true
}

/// YAML-friendly mapping enum (simpler for config files)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum BehaviorMappingYaml {
    #[default]
    Direct,
    Inverted,
    Scaled,
    Constant,
}

impl ReactiveBehavior {
    /// Convert YAML mapping + value fields into resolved BehaviorMapping
    pub fn resolved_mapping(&self) -> BehaviorMapping {
        match self.mapping {
            BehaviorMappingYaml::Direct => BehaviorMapping::Direct,
            BehaviorMappingYaml::Inverted => BehaviorMapping::Inverted,
            BehaviorMappingYaml::Scaled => {
                // TODO: Add scale/offset fields to YAML schema
                BehaviorMapping::Scaled { scale: 1.0, offset: 0.0 }
            }
            BehaviorMappingYaml::Constant => {
                BehaviorMapping::Constant {
                    value: self.value.unwrap_or(0.0),
                }
            }
        }
    }
}

// ============================================================================
// Reactive Scenario Definition
// ============================================================================

/// A reactive scenario containing multiple behaviors
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactiveScenario {
    /// Unique name for the scenario
    pub name: String,

    /// Scenario type (must be "reactive" for this system)
    #[serde(rename = "type", default = "default_reactive")]
    pub scenario_type: String,

    /// Human-readable description
    #[serde(default)]
    pub description: Option<String>,

    /// Whether this is the default scenario to load on startup
    #[serde(default)]
    pub default: bool,

    /// The behaviors that define this scenario
    pub behaviors: Vec<ReactiveBehavior>,
}

fn default_reactive() -> String {
    "reactive".to_string()
}

// ============================================================================
// Validation
// ============================================================================

/// Severity level for validation issues
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationSeverity {
    Error,
    Warning,
}

/// A validation error or warning
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationError {
    /// Which scenario has the issue
    pub scenario: String,
    /// Which behavior (if applicable)
    pub behavior_id: Option<String>,
    /// JSON path-like location (e.g., "scenarios[0].behaviors[2].source")
    pub path: String,
    /// Human-readable error message
    pub message: String,
    /// Error or Warning
    pub severity: ValidationSeverity,
}

impl ValidationError {
    pub fn error(scenario: &str, behavior_id: Option<&str>, path: &str, message: &str) -> Self {
        Self {
            scenario: scenario.to_string(),
            behavior_id: behavior_id.map(|s| s.to_string()),
            path: path.to_string(),
            message: message.to_string(),
            severity: ValidationSeverity::Error,
        }
    }

    pub fn warning(scenario: &str, behavior_id: Option<&str>, path: &str, message: &str) -> Self {
        Self {
            scenario: scenario.to_string(),
            behavior_id: behavior_id.map(|s| s.to_string()),
            path: path.to_string(),
            message: message.to_string(),
            severity: ValidationSeverity::Warning,
        }
    }
}

/// Validation result for a set of scenarios
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_valid(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn add_error(&mut self, error: ValidationError) {
        if error.severity == ValidationSeverity::Error {
            self.errors.push(error);
        } else {
            self.warnings.push(error);
        }
    }

    pub fn merge(&mut self, other: ValidationResult) {
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
    }
}

/// Validates a list of reactive scenarios
pub fn validate_scenarios(
    scenarios: &[ReactiveScenario],
    module_count: usize,
    channel_counts: &[usize], // channels per module
) -> ValidationResult {
    let mut result = ValidationResult::new();

    // Check for exactly 0 or 1 default scenario
    let default_count = scenarios.iter().filter(|s| s.default).count();
    if default_count > 1 {
        result.add_error(ValidationError::error(
            "<global>",
            None,
            "scenarios",
            &format!(
                "Multiple default scenarios defined ({}). Only one scenario can be marked as default.",
                default_count
            ),
        ));
    } else if default_count == 0 && !scenarios.is_empty() {
        result.add_error(ValidationError::warning(
            "<global>",
            None,
            "scenarios",
            "No default scenario defined. Consider marking one scenario with 'default: true'.",
        ));
    }

    // Validate each scenario
    for (scenario_idx, scenario) in scenarios.iter().enumerate() {
        let scenario_path = format!("scenarios[{}]", scenario_idx);

        // Validate scenario type
        if scenario.scenario_type != "reactive" {
            result.add_error(ValidationError::warning(
                &scenario.name,
                None,
                &format!("{}.type", scenario_path),
                &format!(
                    "Scenario type '{}' is not 'reactive'. This scenario will be ignored by the reactive engine.",
                    scenario.scenario_type
                ),
            ));
            continue;
        }

        // Check for duplicate behavior IDs
        let mut behavior_ids: HashMap<&str, usize> = HashMap::new();
        for (idx, behavior) in scenario.behaviors.iter().enumerate() {
            if let Some(prev_idx) = behavior_ids.insert(&behavior.id, idx) {
                result.add_error(ValidationError::error(
                    &scenario.name,
                    Some(&behavior.id),
                    &format!("{}.behaviors[{}].id", scenario_path, idx),
                    &format!(
                        "Duplicate behavior ID '{}'. First defined at behaviors[{}].",
                        behavior.id, prev_idx
                    ),
                ));
            }
        }

        // Validate each behavior
        for (behavior_idx, behavior) in scenario.behaviors.iter().enumerate() {
            let behavior_path = format!("{}.behaviors[{}]", scenario_path, behavior_idx);

            // Validate target channel exists
            validate_channel_ref(
                &behavior.target,
                &format!("{}.target", behavior_path),
                &scenario.name,
                Some(&behavior.id),
                module_count,
                channel_counts,
                &mut result,
            );

            // Validate source requirements based on mapping
            match behavior.mapping {
                BehaviorMappingYaml::Constant => {
                    // Constant mapping should NOT have a source
                    if behavior.source.is_some() {
                        result.add_error(ValidationError::warning(
                            &scenario.name,
                            Some(&behavior.id),
                            &format!("{}.source", behavior_path),
                            "Constant mapping should not have a source. The source field will be ignored.",
                        ));
                    }
                    // Constant mapping MUST have a value
                    if behavior.value.is_none() {
                        result.add_error(ValidationError::error(
                            &scenario.name,
                            Some(&behavior.id),
                            &format!("{}.value", behavior_path),
                            "Constant mapping requires a 'value' field.",
                        ));
                    }
                }
                _ => {
                    // Non-constant mappings MUST have a source
                    if behavior.source.is_none() {
                        result.add_error(ValidationError::error(
                            &scenario.name,
                            Some(&behavior.id),
                            &format!("{}.source", behavior_path),
                            &format!(
                                "Mapping type '{}' requires a 'source' field.",
                                format!("{:?}", behavior.mapping).to_lowercase()
                            ),
                        ));
                    } else if let Some(ref source) = behavior.source {
                        validate_channel_ref(
                            source,
                            &format!("{}.source", behavior_path),
                            &scenario.name,
                            Some(&behavior.id),
                            module_count,
                            channel_counts,
                            &mut result,
                        );
                    }
                }
            }

            // Validate delay
            const MAX_DELAY_MS: u64 = 60_000; // 1 minute max delay
            if behavior.delay_ms > MAX_DELAY_MS {
                result.add_error(ValidationError::warning(
                    &scenario.name,
                    Some(&behavior.id),
                    &format!("{}.delay_ms", behavior_path),
                    &format!(
                        "Delay of {}ms exceeds recommended maximum of {}ms.",
                        behavior.delay_ms, MAX_DELAY_MS
                    ),
                ));
            }
        }
    }

    result
}

fn validate_channel_ref(
    channel_ref: &ChannelRef,
    path: &str,
    scenario: &str,
    behavior_id: Option<&str>,
    module_count: usize,
    channel_counts: &[usize],
    result: &mut ValidationResult,
) {
    if channel_ref.module_position >= module_count {
        result.add_error(ValidationError::error(
            scenario,
            behavior_id,
            path,
            &format!(
                "Module position {} is out of range. Rack has {} modules (0-{}).",
                channel_ref.module_position,
                module_count,
                module_count.saturating_sub(1)
            ),
        ));
    } else if let Some(&max_channels) = channel_counts.get(channel_ref.module_position) {
        if channel_ref.channel as usize >= max_channels {
            result.add_error(ValidationError::error(
                scenario,
                behavior_id,
                path,
                &format!(
                    "Channel {} is out of range for module at position {}. Module has {} channels (0-{}).",
                    channel_ref.channel,
                    channel_ref.module_position,
                    max_channels,
                    max_channels.saturating_sub(1)
                ),
            ));
        }
    }
}

// ============================================================================
// Force Overrides
// ============================================================================

/// Force state for a single channel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelForce {
    pub enabled: bool,
    pub value: f64,
    /// Shadow value: the last Modbus write while forced (for when force is cleared)
    #[serde(default)]
    pub shadow_value: Option<f64>,
    /// Tick when last Modbus write was shadowed
    #[serde(default)]
    pub shadow_write_tick: Option<u64>,
}

impl Default for ChannelForce {
    fn default() -> Self {
        Self {
            enabled: false,
            value: 0.0,
            shadow_value: None,
            shadow_write_tick: None,
        }
    }
}

impl ChannelForce {
    /// Create a new enabled force
    pub fn new(value: f64) -> Self {
        Self {
            enabled: true,
            value,
            shadow_value: None,
            shadow_write_tick: None,
        }
    }

    /// Record a shadow write (Modbus write while forced)
    pub fn record_shadow_write(&mut self, value: f64, tick: u64) {
        self.shadow_value = Some(value);
        self.shadow_write_tick = Some(tick);
    }
}

/// Information about a forced channel (for API responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForceInfo {
    pub module_position: usize,
    pub channel: u16,
    pub value: f64,
    /// Last Modbus-written value (shadowed while forced)
    pub shadow_value: Option<f64>,
}

// ============================================================================
// Manual Override Tracking
// ============================================================================

/// Manual override state for a single channel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualOverride {
    pub value: f64,
    pub set_at_tick: u64,
}

/// Information about a manual override (for API responses)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualInfo {
    pub module_position: usize,
    pub channel: u16,
    pub value: f64,
}

// ============================================================================
// Channel Ownership State
// ============================================================================

/// Complete ownership state for a channel (used internally)
#[derive(Debug, Clone, Default)]
pub struct ChannelOwnership {
    /// The default value (from module initialization)
    pub default_value: f64,
    /// Value set by scenario (if any)
    pub scenario_value: Option<f64>,
    /// Value set manually via GUI (if any)
    pub manual_value: Option<f64>,
    /// Force override (if any)
    pub force: Option<ChannelForce>,
    /// Which behavior owns this channel (if scenario)
    pub scenario_behavior_id: Option<String>,
}

impl ChannelOwnership {
    /// Compute the effective value and source based on priority
    pub fn resolve(&self) -> (f64, ValueSource) {
        // Priority: Force > Manual > Scenario > Default
        if let Some(ref force) = self.force {
            if force.enabled {
                return (force.value, ValueSource::Force);
            }
        }

        if let Some(manual_value) = self.manual_value {
            return (manual_value, ValueSource::Manual);
        }

        if let Some(scenario_value) = self.scenario_value {
            return (
                scenario_value,
                ValueSource::Scenario {
                    scenario_name: String::new(), // Will be filled in by manager
                    behavior_id: self.scenario_behavior_id.clone(),
                },
            );
        }

        (self.default_value, ValueSource::Default)
    }
}

// ============================================================================
// Reactive Scenario Manager
// ============================================================================

/// Manages reactive scenarios, validation, and channel ownership
pub struct ReactiveScenarioManager {
    /// All loaded reactive scenarios
    pub scenarios: HashMap<String, ReactiveScenario>,
    /// Currently active scenario name
    pub active_scenario: Option<String>,
    /// Active scenario runtime (Phase 2)
    pub active_runtime: Option<ReactiveScenarioRuntime>,
    /// Validation results from last load
    pub validation_result: ValidationResult,
    /// Force overrides by channel
    pub forces: HashMap<ChannelRef, ChannelForce>,
    /// Manual overrides by channel
    pub manual_overrides: HashMap<ChannelRef, ManualOverride>,
    /// Current tick counter
    pub current_tick: u64,
}

impl ReactiveScenarioManager {
    pub fn new() -> Self {
        Self {
            scenarios: HashMap::new(),
            active_scenario: None,
            active_runtime: None,
            validation_result: ValidationResult::new(),
            forces: HashMap::new(),
            manual_overrides: HashMap::new(),
            current_tick: 0,
        }
    }

    /// Load scenarios from parsed YAML config
    pub fn load_scenarios(
        &mut self,
        scenarios: Vec<ReactiveScenario>,
        module_count: usize,
        channel_counts: &[usize],
    ) {
        // Clear existing runtime and scenarios
        self.active_runtime = None;
        self.active_scenario = None;
        self.scenarios.clear();

        // Filter to only reactive scenarios
        let reactive_scenarios: Vec<ReactiveScenario> = scenarios
            .into_iter()
            .filter(|s| s.scenario_type == "reactive")
            .collect();

        // Validate
        self.validation_result = validate_scenarios(&reactive_scenarios, module_count, channel_counts);

        // Store valid scenarios
        for scenario in reactive_scenarios {
            self.scenarios.insert(scenario.name.clone(), scenario);
        }

        // Note: To auto-activate the default scenario with its runtime,
        // call auto_activate_default() after this method.
    }

    /// Auto-activate the default scenario (if one exists and validation passed)
    /// Call this after load_scenarios() to start the default scenario's runtime
    pub fn auto_activate_default(&mut self, tick_ms: u64) -> Result<Option<String>, String> {
        if !self.validation_result.is_valid() {
            return Ok(None); // Don't auto-activate if there are validation errors
        }

        // Find the default scenario
        let default_name = self.scenarios
            .values()
            .find(|s| s.default)
            .map(|s| s.name.clone());

        if let Some(name) = default_name {
            self.activate_scenario_with_runtime(&name, tick_ms)?;
            Ok(Some(name))
        } else {
            Ok(None)
        }
    }

    /// Get the active scenario (if any)
    pub fn get_active_scenario(&self) -> Option<&ReactiveScenario> {
        self.active_scenario
            .as_ref()
            .and_then(|name| self.scenarios.get(name))
    }

    /// List all available reactive scenarios
    pub fn list_scenarios(&self) -> Vec<&ReactiveScenario> {
        self.scenarios.values().collect()
    }

    /// Activate a scenario by name
    pub fn activate_scenario(&mut self, name: &str) -> Result<(), String> {
        if !self.scenarios.contains_key(name) {
            return Err(format!("Scenario '{}' not found", name));
        }
        self.active_scenario = Some(name.to_string());
        Ok(())
    }

    /// Deactivate the current scenario
    pub fn deactivate_scenario(&mut self) {
        self.active_scenario = None;
    }

    /// Get validation errors
    pub fn get_validation_errors(&self) -> &[ValidationError] {
        &self.validation_result.errors
    }

    /// Get validation warnings
    pub fn get_validation_warnings(&self) -> &[ValidationError] {
        &self.validation_result.warnings
    }

    // --- Force Management ---

    /// Set a force override on a channel
    pub fn set_force(&mut self, channel: ChannelRef, value: f64) {
        self.forces.insert(channel, ChannelForce::new(value));
    }

    /// Clear a force override
    pub fn clear_force(&mut self, channel: &ChannelRef) {
        self.forces.remove(channel);
    }

    /// Clear all force overrides
    pub fn clear_all_forces(&mut self) {
        self.forces.clear();
    }

    /// Get all active forces
    pub fn get_forces(&self) -> Vec<ForceInfo> {
        self.forces
            .iter()
            .filter(|(_, f)| f.enabled)
            .map(|(ch, f)| ForceInfo {
                module_position: ch.module_position,
                channel: ch.channel,
                value: f.value,
                shadow_value: f.shadow_value,
            })
            .collect()
    }

    /// Check if a channel is forced
    pub fn is_forced(&self, channel: &ChannelRef) -> bool {
        self.forces
            .get(channel)
            .map(|f| f.enabled)
            .unwrap_or(false)
    }

    /// Get the forced value for a channel (if forced)
    pub fn get_forced_value(&self, channel: &ChannelRef) -> Option<f64> {
        self.forces
            .get(channel)
            .filter(|f| f.enabled)
            .map(|f| f.value)
    }

    /// Record a shadow write for a forced channel (Modbus write while forced)
    /// Returns true if the channel was forced and the shadow was recorded
    pub fn record_shadow_write(&mut self, channel: &ChannelRef, value: f64) -> bool {
        if let Some(force) = self.forces.get_mut(channel) {
            if force.enabled {
                force.record_shadow_write(value, self.current_tick);
                return true;
            }
        }
        false
    }

    // --- Manual Override Management ---

    /// Set a manual override on a channel
    pub fn set_manual_override(&mut self, channel: ChannelRef, value: f64) {
        self.manual_overrides.insert(
            channel,
            ManualOverride {
                value,
                set_at_tick: self.current_tick,
            },
        );
    }

    /// Clear a manual override
    pub fn clear_manual_override(&mut self, channel: &ChannelRef) {
        self.manual_overrides.remove(channel);
    }

    /// Clear all manual overrides
    pub fn clear_all_manual_overrides(&mut self) {
        self.manual_overrides.clear();
    }

    /// Get all manual overrides
    pub fn get_manual_overrides(&self) -> Vec<ManualInfo> {
        self.manual_overrides
            .iter()
            .map(|(ch, m)| ManualInfo {
                module_position: ch.module_position,
                channel: ch.channel,
                value: m.value,
            })
            .collect()
    }

    /// Check if a channel has a manual override
    pub fn has_manual_override(&self, channel: &ChannelRef) -> bool {
        self.manual_overrides.contains_key(channel)
    }

    /// Increment the tick counter
    pub fn tick(&mut self) {
        self.current_tick += 1;
    }
}

impl Default for ReactiveScenarioManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Phase 2: Dependency Graph and Cycle Detection
// ============================================================================

/// Result of building a dependency graph
#[derive(Debug, Clone)]
pub struct DependencyGraph {
    /// Map from behavior ID to its index in the behaviors list
    pub behavior_indices: HashMap<String, usize>,
    /// Adjacency list: behavior index -> list of dependent behavior indices
    /// An edge from A to B means A's target is B's source (B depends on A)
    pub edges: HashMap<usize, Vec<usize>>,
    /// Reverse edges for finding dependencies
    pub reverse_edges: HashMap<usize, Vec<usize>>,
    /// Topologically sorted behavior indices (evaluation order)
    pub topo_order: Vec<usize>,
    /// Detected cycles (if any) - each cycle is a list of behavior IDs
    pub cycles: Vec<Vec<String>>,
}

impl DependencyGraph {
    /// Build a dependency graph from a scenario's behaviors
    pub fn build(scenario: &ReactiveScenario) -> Self {
        let mut behavior_indices = HashMap::new();
        let mut edges: HashMap<usize, Vec<usize>> = HashMap::new();
        let mut reverse_edges: HashMap<usize, Vec<usize>> = HashMap::new();

        // Map behavior IDs to indices
        for (idx, behavior) in scenario.behaviors.iter().enumerate() {
            behavior_indices.insert(behavior.id.clone(), idx);
            edges.insert(idx, Vec::new());
            reverse_edges.insert(idx, Vec::new());
        }

        // Build a map from target channels to behavior indices
        let mut target_to_behavior: HashMap<ChannelRef, usize> = HashMap::new();
        for (idx, behavior) in scenario.behaviors.iter().enumerate() {
            target_to_behavior.insert(behavior.target.clone(), idx);
        }

        // Build edges: if behavior B's source is behavior A's target, A -> B
        for (idx, behavior) in scenario.behaviors.iter().enumerate() {
            if let Some(ref source) = behavior.source {
                // Find if any behavior targets this source channel
                if let Some(&source_behavior_idx) = target_to_behavior.get(source) {
                    if source_behavior_idx != idx {
                        // source_behavior_idx produces data that idx consumes
                        edges.get_mut(&source_behavior_idx).unwrap().push(idx);
                        reverse_edges.get_mut(&idx).unwrap().push(source_behavior_idx);
                    }
                }
            }
        }

        // Detect cycles using DFS
        let cycles = Self::detect_cycles(&edges, &behavior_indices, &scenario.behaviors);

        // Compute topological order (only if no cycles)
        let topo_order = if cycles.is_empty() {
            Self::topological_sort(&edges, &reverse_edges, scenario.behaviors.len())
        } else {
            // Return behaviors in definition order if cycles exist
            (0..scenario.behaviors.len()).collect()
        };

        Self {
            behavior_indices,
            edges,
            reverse_edges,
            topo_order,
            cycles,
        }
    }

    /// Detect cycles using DFS with coloring
    fn detect_cycles(
        edges: &HashMap<usize, Vec<usize>>,
        behavior_indices: &HashMap<String, usize>,
        behaviors: &[ReactiveBehavior],
    ) -> Vec<Vec<String>> {
        let n = behaviors.len();
        let mut color = vec![0u8; n]; // 0=white, 1=gray, 2=black
        let mut parent = vec![None; n];
        let mut cycles = Vec::new();

        // Reverse map: index -> behavior ID
        let idx_to_id: HashMap<usize, &str> = behavior_indices
            .iter()
            .map(|(id, &idx)| (idx, id.as_str()))
            .collect();

        for start in 0..n {
            if color[start] == 0 {
                let mut stack = vec![(start, false)];

                while let Some((node, processed)) = stack.pop() {
                    if processed {
                        color[node] = 2; // black
                        continue;
                    }

                    if color[node] == 1 {
                        // Back edge to gray node = cycle
                        continue;
                    }

                    color[node] = 1; // gray
                    stack.push((node, true)); // Mark for post-processing

                    if let Some(neighbors) = edges.get(&node) {
                        for &next in neighbors {
                            if color[next] == 1 {
                                // Found a cycle - reconstruct it
                                let mut cycle = vec![idx_to_id[&next].to_string()];
                                let mut curr = node;
                                while curr != next {
                                    cycle.push(idx_to_id[&curr].to_string());
                                    if let Some(p) = parent[curr] {
                                        curr = p;
                                    } else {
                                        break;
                                    }
                                }
                                cycle.push(idx_to_id[&next].to_string());
                                cycle.reverse();
                                cycles.push(cycle);
                            } else if color[next] == 0 {
                                parent[next] = Some(node);
                                stack.push((next, false));
                            }
                        }
                    }
                }
            }
        }

        cycles
    }

    /// Compute topological sort using Kahn's algorithm
    fn topological_sort(
        edges: &HashMap<usize, Vec<usize>>,
        reverse_edges: &HashMap<usize, Vec<usize>>,
        n: usize,
    ) -> Vec<usize> {
        // Calculate in-degrees (number of dependencies each node has)
        let mut in_degree = vec![0usize; n];
        for i in 0..n {
            in_degree[i] = reverse_edges.get(&i).map(|v| v.len()).unwrap_or(0);
        }

        // Start with nodes that have no dependencies
        let mut queue: VecDeque<usize> = (0..n).filter(|&i| in_degree[i] == 0).collect();
        let mut result = Vec::with_capacity(n);

        while let Some(node) = queue.pop_front() {
            result.push(node);

            if let Some(neighbors) = edges.get(&node) {
                for &next in neighbors {
                    in_degree[next] -= 1;
                    if in_degree[next] == 0 {
                        queue.push_back(next);
                    }
                }
            }
        }

        // If we didn't process all nodes, there's a cycle (shouldn't happen if cycles is empty)
        if result.len() != n {
            // Fallback to definition order
            return (0..n).collect();
        }

        result
    }

    /// Check if the graph has cycles
    pub fn has_cycles(&self) -> bool {
        !self.cycles.is_empty()
    }
}

// ============================================================================
// Phase 2: Behavior Runtime State
// ============================================================================

/// Runtime state for a single behavior (tracks delays and pending values)
#[derive(Debug, Clone, Default)]
pub struct BehaviorRuntime {
    /// Last observed source value
    pub last_source_value: Option<f64>,
    /// Tick when source value last changed
    pub last_change_tick: Option<u64>,
    /// Tick when pending value should be applied
    pub pending_until_tick: Option<u64>,
    /// Value waiting to be applied after delay
    pub pending_value: Option<f64>,
    /// Last tick when this behavior applied a value
    pub last_applied_tick: Option<u64>,
}

impl BehaviorRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    /// Clear all pending state (used on scenario deactivation)
    pub fn clear(&mut self) {
        self.last_source_value = None;
        self.last_change_tick = None;
        self.pending_until_tick = None;
        self.pending_value = None;
        self.last_applied_tick = None;
    }
}

/// Debug information for a behavior (for introspection API)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorDebug {
    pub scenario: String,
    pub behavior_id: String,
    pub enabled: bool,
    pub source_module: Option<usize>,
    pub source_channel: Option<u16>,
    pub target_module: usize,
    pub target_channel: u16,
    pub mapping: String,
    pub delay_ms: u64,
    pub last_source_value: Option<f64>,
    pub pending_until_tick: Option<u64>,
    pub pending_value: Option<f64>,
    pub last_applied_tick: Option<u64>,
    pub blocked_by: Option<String>, // "Force", "Manual", or None
}

/// Debug information for a channel (for introspection API)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelDebug {
    pub module_position: usize,
    pub channel: u16,
    pub value: f64,
    pub source: String, // "Force", "Manual", "Scenario", "Default"
    pub forced: bool,
    pub manual: bool,
    pub scenario_behavior_id: Option<String>,
}

// ============================================================================
// Phase 2: Reactive Scenario Runtime
// ============================================================================

/// Runtime for an active reactive scenario
#[derive(Debug)]
pub struct ReactiveScenarioRuntime {
    /// The scenario being run
    pub scenario_name: String,
    /// Dependency graph for deterministic evaluation
    pub graph: DependencyGraph,
    /// Per-behavior runtime state
    pub behavior_states: HashMap<String, BehaviorRuntime>,
    /// Tick rate in milliseconds (for delay calculations)
    pub tick_ms: u64,
}

impl ReactiveScenarioRuntime {
    /// Create a new runtime for a scenario
    pub fn new(scenario: &ReactiveScenario, tick_ms: u64) -> Result<Self, String> {
        let graph = DependencyGraph::build(scenario);

        // Check for cycles
        if graph.has_cycles() {
            let cycle_strs: Vec<String> = graph.cycles
                .iter()
                .map(|c| c.join(" -> "))
                .collect();
            return Err(format!(
                "Scenario '{}' contains dependency cycles: {}",
                scenario.name,
                cycle_strs.join("; ")
            ));
        }

        // Initialize behavior states
        let mut behavior_states = HashMap::new();
        for behavior in &scenario.behaviors {
            behavior_states.insert(behavior.id.clone(), BehaviorRuntime::new());
        }

        Ok(Self {
            scenario_name: scenario.name.clone(),
            graph,
            behavior_states,
            tick_ms,
        })
    }

    /// Lifecycle hook: called when scenario is activated
    pub fn on_activate(&mut self) {
        // Clear all pending states
        for state in self.behavior_states.values_mut() {
            state.clear();
        }
    }

    /// Lifecycle hook: called when scenario is deactivated
    pub fn on_deactivate(&mut self) {
        // Clear all pending states to prevent ghost updates
        for state in self.behavior_states.values_mut() {
            state.clear();
        }
    }

    /// Evaluate all behaviors and return values to apply
    /// Returns: Vec<(ChannelRef, value, behavior_id)>
    pub fn evaluate(
        &mut self,
        scenario: &ReactiveScenario,
        current_tick: u64,
        get_channel_value: impl Fn(&ChannelRef) -> f64,
        is_forced: impl Fn(&ChannelRef) -> bool,
        has_manual: impl Fn(&ChannelRef) -> bool,
    ) -> Vec<(ChannelRef, f64, String)> {
        let mut results = Vec::new();

        // Evaluate behaviors in topological order
        for &behavior_idx in &self.graph.topo_order {
            let behavior = &scenario.behaviors[behavior_idx];

            // Skip disabled behaviors
            if !behavior.enabled {
                continue;
            }

            // Skip if target is forced or has manual override
            if is_forced(&behavior.target) || has_manual(&behavior.target) {
                continue;
            }

            let runtime = self.behavior_states
                .get_mut(&behavior.id)
                .expect("Behavior state must exist");

            // Calculate the output value based on mapping
            let output_value = match behavior.resolved_mapping() {
                BehaviorMapping::Constant { value } => value,
                BehaviorMapping::Direct => {
                    if let Some(ref source) = behavior.source {
                        get_channel_value(source)
                    } else {
                        continue; // No source, skip
                    }
                }
                BehaviorMapping::Inverted => {
                    if let Some(ref source) = behavior.source {
                        let v = get_channel_value(source);
                        // For boolean-like values (0 or 1), invert
                        if v > 0.5 { 0.0 } else { 1.0 }
                    } else {
                        continue;
                    }
                }
                BehaviorMapping::Scaled { scale, offset } => {
                    if let Some(ref source) = behavior.source {
                        get_channel_value(source) * scale + offset
                    } else {
                        continue;
                    }
                }
            };

            // Handle delays
            if behavior.delay_ms > 0 {
                // Check if source value changed
                let source_value = behavior.source.as_ref().map(|s| get_channel_value(s));
                let source_changed = source_value != runtime.last_source_value;

                if source_changed {
                    // Source changed - schedule new pending value
                    let delay_ticks = (behavior.delay_ms / self.tick_ms).max(1);
                    runtime.pending_until_tick = Some(current_tick + delay_ticks);
                    runtime.pending_value = Some(output_value);
                    runtime.last_source_value = source_value;
                    runtime.last_change_tick = Some(current_tick);
                }

                // Check if pending value is ready
                if let (Some(until_tick), Some(pending)) = (runtime.pending_until_tick, runtime.pending_value) {
                    if current_tick >= until_tick {
                        // Apply pending value
                        results.push((behavior.target.clone(), pending, behavior.id.clone()));
                        runtime.last_applied_tick = Some(current_tick);
                        runtime.pending_until_tick = None;
                        runtime.pending_value = None;
                    }
                }
            } else {
                // No delay - apply immediately
                results.push((behavior.target.clone(), output_value, behavior.id.clone()));
                runtime.last_applied_tick = Some(current_tick);
                runtime.last_source_value = behavior.source.as_ref().map(|s| get_channel_value(s));
            }
        }

        results
    }

    /// Get debug state for all behaviors
    pub fn get_debug_state(&self, scenario: &ReactiveScenario, is_forced: impl Fn(&ChannelRef) -> bool, has_manual: impl Fn(&ChannelRef) -> bool) -> Vec<BehaviorDebug> {
        scenario.behaviors.iter().map(|behavior| {
            let runtime = self.behavior_states.get(&behavior.id);

            let blocked_by = if is_forced(&behavior.target) {
                Some("Force".to_string())
            } else if has_manual(&behavior.target) {
                Some("Manual".to_string())
            } else {
                None
            };

            BehaviorDebug {
                scenario: self.scenario_name.clone(),
                behavior_id: behavior.id.clone(),
                enabled: behavior.enabled,
                source_module: behavior.source.as_ref().map(|s| s.module_position),
                source_channel: behavior.source.as_ref().map(|s| s.channel),
                target_module: behavior.target.module_position,
                target_channel: behavior.target.channel,
                mapping: format!("{:?}", behavior.mapping).to_lowercase(),
                delay_ms: behavior.delay_ms,
                last_source_value: runtime.and_then(|r| r.last_source_value),
                pending_until_tick: runtime.and_then(|r| r.pending_until_tick),
                pending_value: runtime.and_then(|r| r.pending_value),
                last_applied_tick: runtime.and_then(|r| r.last_applied_tick),
                blocked_by,
            }
        }).collect()
    }
}

// ============================================================================
// Extended ReactiveScenarioManager with Runtime
// ============================================================================

impl ReactiveScenarioManager {
    /// Activate a scenario and create its runtime
    pub fn activate_scenario_with_runtime(&mut self, name: &str, tick_ms: u64) -> Result<(), String> {
        if !self.scenarios.contains_key(name) {
            return Err(format!("Scenario '{}' not found", name));
        }

        // Deactivate current runtime if any
        self.active_runtime = None;

        // Create new runtime
        let scenario = self.scenarios.get(name).unwrap();
        let mut runtime = ReactiveScenarioRuntime::new(scenario, tick_ms)?;
        runtime.on_activate();

        self.active_scenario = Some(name.to_string());
        self.active_runtime = Some(runtime);

        Ok(())
    }

    /// Deactivate the current scenario and its runtime
    pub fn deactivate_scenario_with_runtime(&mut self) {
        if let Some(ref mut runtime) = self.active_runtime {
            runtime.on_deactivate();
        }
        self.active_runtime = None;
        self.active_scenario = None;
    }

    /// Get the active runtime (if any)
    pub fn get_active_runtime(&self) -> Option<&ReactiveScenarioRuntime> {
        self.active_runtime.as_ref()
    }

    /// Get mutable reference to active runtime
    pub fn get_active_runtime_mut(&mut self) -> Option<&mut ReactiveScenarioRuntime> {
        self.active_runtime.as_mut()
    }

    /// Evaluate the active scenario and return values to apply
    pub fn evaluate_active_scenario(
        &mut self,
        get_channel_value: impl Fn(&ChannelRef) -> f64,
    ) -> Vec<(ChannelRef, f64, String)> {
        let current_tick = self.current_tick;
        let forces = &self.forces;
        let manual_overrides = &self.manual_overrides;

        // Need to get scenario and runtime together
        let scenario = self.active_scenario.as_ref()
            .and_then(|name| self.scenarios.get(name))
            .cloned();

        if let (Some(scenario), Some(runtime)) = (scenario, self.active_runtime.as_mut()) {
            let is_forced = |ch: &ChannelRef| forces.get(ch).map(|f| f.enabled).unwrap_or(false);
            let has_manual = |ch: &ChannelRef| manual_overrides.contains_key(ch);

            runtime.evaluate(&scenario, current_tick, get_channel_value, is_forced, has_manual)
        } else {
            Vec::new()
        }
    }

    /// Get debug state for the active scenario
    pub fn get_reactive_debug_state(&self) -> Vec<BehaviorDebug> {
        let forces = &self.forces;
        let manual_overrides = &self.manual_overrides;

        let scenario = self.active_scenario.as_ref()
            .and_then(|name| self.scenarios.get(name));

        if let (Some(scenario), Some(runtime)) = (scenario, &self.active_runtime) {
            let is_forced = |ch: &ChannelRef| forces.get(ch).map(|f| f.enabled).unwrap_or(false);
            let has_manual = |ch: &ChannelRef| manual_overrides.contains_key(ch);

            runtime.get_debug_state(scenario, is_forced, has_manual)
        } else {
            Vec::new()
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_value_source_priority() {
        assert!(ValueSource::Force.priority() > ValueSource::Manual.priority());
        assert!(ValueSource::Manual.priority() > ValueSource::Scenario {
            scenario_name: "test".to_string(),
            behavior_id: None
        }.priority());
        assert!(ValueSource::Scenario {
            scenario_name: "test".to_string(),
            behavior_id: None
        }.priority() > ValueSource::Default.priority());
    }

    #[test]
    fn test_channel_ownership_resolve() {
        let mut ownership = ChannelOwnership::default();
        ownership.default_value = 0.5;

        // Default only
        let (value, source) = ownership.resolve();
        assert_eq!(value, 0.5);
        assert_eq!(source, ValueSource::Default);

        // Add scenario
        ownership.scenario_value = Some(0.75);
        let (value, source) = ownership.resolve();
        assert_eq!(value, 0.75);
        assert!(matches!(source, ValueSource::Scenario { .. }));

        // Add manual
        ownership.manual_value = Some(0.9);
        let (value, source) = ownership.resolve();
        assert_eq!(value, 0.9);
        assert_eq!(source, ValueSource::Manual);

        // Add force
        ownership.force = Some(ChannelForce::new(1.0));
        let (value, source) = ownership.resolve();
        assert_eq!(value, 1.0);
        assert_eq!(source, ValueSource::Force);

        // Disable force
        ownership.force = Some(ChannelForce {
            enabled: false,
            value: 1.0,
            shadow_value: None,
            shadow_write_tick: None,
        });
        let (value, source) = ownership.resolve();
        assert_eq!(value, 0.9);
        assert_eq!(source, ValueSource::Manual);
    }

    #[test]
    fn test_validate_duplicate_behavior_ids() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "dup".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "dup".to_string(),
                    source: Some(ChannelRef::new(0, 2)),
                    target: ChannelRef::new(0, 3),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let result = validate_scenarios(&[scenario], 1, &[4]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("Duplicate behavior ID")));
    }

    #[test]
    fn test_validate_constant_requires_value() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "const_no_value".to_string(),
                    source: None,
                    target: ChannelRef::new(0, 0),
                    mapping: BehaviorMappingYaml::Constant,
                    delay_ms: 0,
                    enabled: true,
                    value: None, // Missing value!
                },
            ],
        };

        let result = validate_scenarios(&[scenario], 1, &[4]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("requires a 'value' field")));
    }

    #[test]
    fn test_validate_direct_requires_source() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "direct_no_source".to_string(),
                    source: None, // Missing source!
                    target: ChannelRef::new(0, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let result = validate_scenarios(&[scenario], 1, &[4]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("requires a 'source' field")));
    }

    #[test]
    fn test_validate_channel_out_of_range() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "out_of_range".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(5, 0), // Module 5 doesn't exist
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let result = validate_scenarios(&[scenario], 2, &[4, 4]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("out of range")));
    }

    #[test]
    fn test_validate_multiple_defaults() {
        let scenarios = vec![
            ReactiveScenario {
                name: "default1".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: true,
                behaviors: vec![],
            },
            ReactiveScenario {
                name: "default2".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: true,
                behaviors: vec![],
            },
        ];

        let result = validate_scenarios(&scenarios, 0, &[]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("Multiple default scenarios")));
    }

    // ========== Phase 2 Tests ==========

    #[test]
    fn test_dependency_graph_no_deps() {
        // Two independent behaviors (no dependencies)
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "a".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "b".to_string(),
                    source: Some(ChannelRef::new(0, 1)),
                    target: ChannelRef::new(1, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let graph = DependencyGraph::build(&scenario);
        assert!(!graph.has_cycles());
        assert_eq!(graph.topo_order.len(), 2);
    }

    #[test]
    fn test_dependency_graph_chain() {
        // A -> B: A targets channel that B reads
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "a".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0), // A writes to (1,0)
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "b".to_string(),
                    source: Some(ChannelRef::new(1, 0)), // B reads from (1,0)
                    target: ChannelRef::new(2, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let graph = DependencyGraph::build(&scenario);
        assert!(!graph.has_cycles());
        // A should come before B in topo order
        let a_idx = graph.behavior_indices["a"];
        let b_idx = graph.behavior_indices["b"];
        let a_pos = graph.topo_order.iter().position(|&x| x == a_idx).unwrap();
        let b_pos = graph.topo_order.iter().position(|&x| x == b_idx).unwrap();
        assert!(a_pos < b_pos, "A should be evaluated before B");
    }

    #[test]
    fn test_dependency_graph_cycle_detection() {
        // A -> B -> A (cycle)
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "a".to_string(),
                    source: Some(ChannelRef::new(1, 0)), // A reads from (1,0) - B's target
                    target: ChannelRef::new(0, 0), // A writes to (0,0)
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "b".to_string(),
                    source: Some(ChannelRef::new(0, 0)), // B reads from (0,0) - A's target
                    target: ChannelRef::new(1, 0), // B writes to (1,0)
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let graph = DependencyGraph::build(&scenario);
        assert!(graph.has_cycles(), "Should detect cycle between A and B");
    }

    #[test]
    fn test_runtime_creation_rejects_cycles() {
        let scenario = ReactiveScenario {
            name: "cyclic".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "a".to_string(),
                    source: Some(ChannelRef::new(1, 0)),
                    target: ChannelRef::new(0, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "b".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let result = ReactiveScenarioRuntime::new(&scenario, 10);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cycles"));
    }

    #[test]
    fn test_runtime_evaluate_direct_mapping() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "direct".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();
        runtime.on_activate();

        let get_value = |ch: &ChannelRef| {
            if ch.module_position == 0 && ch.channel == 0 {
                0.75
            } else {
                0.0
            }
        };
        let is_forced = |_: &ChannelRef| false;
        let has_manual = |_: &ChannelRef| false;

        let results = runtime.evaluate(&scenario, 1, get_value, is_forced, has_manual);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, ChannelRef::new(1, 0));
        assert_eq!(results[0].1, 0.75);
        assert_eq!(results[0].2, "direct");
    }

    #[test]
    fn test_runtime_evaluate_inverted_mapping() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "inverted".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Inverted,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Source is ON (1.0) -> output should be OFF (0.0)
        let get_value = |_: &ChannelRef| 1.0;
        let results = runtime.evaluate(&scenario, 1, get_value, |_| false, |_| false);
        assert_eq!(results[0].1, 0.0);

        // Source is OFF (0.0) -> output should be ON (1.0)
        let get_value = |_: &ChannelRef| 0.0;
        let results = runtime.evaluate(&scenario, 2, get_value, |_| false, |_| false);
        assert_eq!(results[0].1, 1.0);
    }

    #[test]
    fn test_runtime_evaluate_constant_mapping() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "constant".to_string(),
                    source: None,
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Constant,
                    delay_ms: 0,
                    enabled: true,
                    value: Some(42.5),
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();
        let results = runtime.evaluate(&scenario, 1, |_| 0.0, |_| false, |_| false);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1, 42.5);
    }

    #[test]
    fn test_runtime_respects_force_override() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "blocked".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Target is forced - behavior should not produce output
        let is_forced = |ch: &ChannelRef| ch.module_position == 1 && ch.channel == 0;
        let results = runtime.evaluate(&scenario, 1, |_| 1.0, is_forced, |_| false);

        assert!(results.is_empty(), "Forced channel should block behavior output");
    }

    #[test]
    fn test_force_shadow_write() {
        let mut manager = ReactiveScenarioManager::new();
        let channel = ChannelRef::new(0, 0);

        // Set a force
        manager.set_force(channel.clone(), 100.0);
        assert!(manager.is_forced(&channel));
        assert_eq!(manager.get_forced_value(&channel), Some(100.0));

        // Record a shadow write
        manager.current_tick = 5;
        assert!(manager.record_shadow_write(&channel, 50.0));

        // Check the shadow value is recorded
        let forces = manager.get_forces();
        assert_eq!(forces.len(), 1);
        assert_eq!(forces[0].value, 100.0);
        assert_eq!(forces[0].shadow_value, Some(50.0));
    }

    #[test]
    fn test_force_clear_reverts_deterministically() {
        let mut manager = ReactiveScenarioManager::new();
        let channel = ChannelRef::new(0, 0);

        // Set force
        manager.set_force(channel.clone(), 100.0);
        assert!(manager.is_forced(&channel));

        // Clear force
        manager.clear_force(&channel);
        assert!(!manager.is_forced(&channel));
        assert_eq!(manager.get_forced_value(&channel), None);
    }

    #[test]
    fn test_force_not_recorded_when_not_forced() {
        let mut manager = ReactiveScenarioManager::new();
        let channel = ChannelRef::new(0, 0);

        // Try to record shadow write on non-forced channel
        assert!(!manager.record_shadow_write(&channel, 50.0));
    }

    #[test]
    fn test_runtime_delay_behavior() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "delayed".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(1, 0),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 50, // 50ms delay
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap(); // 10ms tick

        // Tick 1: Source changes to 1.0 - should not produce output yet
        let results = runtime.evaluate(&scenario, 1, |_| 1.0, |_| false, |_| false);
        assert!(results.is_empty(), "Delayed behavior should not produce output immediately");

        // Tick 2-4: Still waiting
        for tick in 2..=4 {
            let results = runtime.evaluate(&scenario, tick, |_| 1.0, |_| false, |_| false);
            assert!(results.is_empty(), "Still waiting for delay at tick {}", tick);
        }

        // Tick 5: 50ms has passed (5 ticks * 10ms) - should produce output
        // Note: delay_ms / tick_ms = 50/10 = 5 ticks
        let results = runtime.evaluate(&scenario, 6, |_| 1.0, |_| false, |_| false);
        assert_eq!(results.len(), 1, "Delayed behavior should produce output after delay");
        assert_eq!(results[0].1, 1.0);
    }

    // ========== Phase 4 Tests: Scenario Management ==========

    #[test]
    fn test_auto_activate_default_scenario() {
        let mut manager = ReactiveScenarioManager::new();

        let scenarios = vec![
            ReactiveScenario {
                name: "non-default".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: false,
                behaviors: vec![],
            },
            ReactiveScenario {
                name: "default-scenario".to_string(),
                scenario_type: "reactive".to_string(),
                description: Some("The default".to_string()),
                default: true,
                behaviors: vec![],
            },
        ];

        manager.load_scenarios(scenarios, 0, &[]);

        // Auto-activate should return the default scenario name
        let result = manager.auto_activate_default(100);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), Some("default-scenario".to_string()));

        // Active scenario should be set
        assert_eq!(manager.active_scenario, Some("default-scenario".to_string()));
        assert!(manager.active_runtime.is_some());
    }

    #[test]
    fn test_auto_activate_no_default() {
        let mut manager = ReactiveScenarioManager::new();

        let scenarios = vec![
            ReactiveScenario {
                name: "scenario1".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: false,
                behaviors: vec![],
            },
        ];

        manager.load_scenarios(scenarios, 0, &[]);

        // Auto-activate should return None when no default exists
        let result = manager.auto_activate_default(100);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);

        // No active scenario should be set
        assert!(manager.active_scenario.is_none());
        assert!(manager.active_runtime.is_none());
    }

    #[test]
    fn test_scenario_switching_clears_runtime() {
        let mut manager = ReactiveScenarioManager::new();

        let scenarios = vec![
            ReactiveScenario {
                name: "scenario-a".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: true,
                behaviors: vec![
                    ReactiveBehavior {
                        id: "behavior-a".to_string(),
                        source: None,
                        target: ChannelRef::new(0, 0),
                        mapping: BehaviorMappingYaml::Constant,
                        delay_ms: 0,
                        enabled: true,
                        value: Some(1.0),
                    },
                ],
            },
            ReactiveScenario {
                name: "scenario-b".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: false,
                behaviors: vec![
                    ReactiveBehavior {
                        id: "behavior-b".to_string(),
                        source: None,
                        target: ChannelRef::new(0, 1),
                        mapping: BehaviorMappingYaml::Constant,
                        delay_ms: 0,
                        enabled: true,
                        value: Some(2.0),
                    },
                ],
            },
        ];

        manager.load_scenarios(scenarios, 1, &[2]);
        manager.auto_activate_default(100).unwrap();

        // Verify scenario-a is active
        assert_eq!(manager.active_scenario, Some("scenario-a".to_string()));

        // Switch to scenario-b
        let result = manager.activate_scenario_with_runtime("scenario-b", 100);
        assert!(result.is_ok());

        // Verify scenario-b is now active
        assert_eq!(manager.active_scenario, Some("scenario-b".to_string()));
        assert!(manager.active_runtime.is_some());

        // The runtime should be for scenario-b
        let runtime = manager.active_runtime.as_ref().unwrap();
        assert_eq!(runtime.scenario_name, "scenario-b");
    }

    #[test]
    fn test_deactivate_clears_everything() {
        let mut manager = ReactiveScenarioManager::new();

        let scenarios = vec![
            ReactiveScenario {
                name: "test-scenario".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: true,
                behaviors: vec![],
            },
        ];

        manager.load_scenarios(scenarios, 0, &[]);
        manager.auto_activate_default(100).unwrap();

        assert!(manager.active_scenario.is_some());
        assert!(manager.active_runtime.is_some());

        // Deactivate
        manager.deactivate_scenario_with_runtime();

        // Both should be cleared
        assert!(manager.active_scenario.is_none());
        assert!(manager.active_runtime.is_none());
    }

    // ========== Phase 7 Tests: Additional Coverage ==========

    #[test]
    fn test_topo_order_stability() {
        // Test that evaluation order is deterministic: A→B→C chain
        let scenario = ReactiveScenario {
            name: "chain".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                // B depends on A
                ReactiveBehavior {
                    id: "b".to_string(),
                    source: Some(ChannelRef::new(0, 0)), // reads A
                    target: ChannelRef::new(0, 1),       // writes B
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                // C depends on B
                ReactiveBehavior {
                    id: "c".to_string(),
                    source: Some(ChannelRef::new(0, 1)), // reads B
                    target: ChannelRef::new(0, 2),       // writes C
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Verify topo order: b should come before c
        assert_eq!(runtime.graph.topo_order.len(), 2);
        let b_idx = runtime.graph.topo_order.iter().position(|&i| i == 0).unwrap();
        let c_idx = runtime.graph.topo_order.iter().position(|&i| i == 1).unwrap();
        assert!(b_idx < c_idx, "b should be evaluated before c due to dependency");
    }

    #[test]
    fn test_scaled_mapping() {
        // Note: Current implementation uses hardcoded scale=1.0, offset=0.0
        // The value field is not used for scaled mapping (TODO in implementation)
        let scenario = ReactiveScenario {
            name: "scaled".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "scale".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Scaled,
                    delay_ms: 0,
                    enabled: true,
                    value: None, // Not used by current scaled implementation
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Source value 5.0, scale 1.0, offset 0.0 -> output should be 5.0
        let results = runtime.evaluate(&scenario, 1, |_| 5.0, |_| false, |_| false);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1, 5.0); // 5.0 * 1.0 + 0.0 = 5.0
    }

    #[test]
    fn test_manual_override_blocks_scenario() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "blocked".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Target (0,1) has manual override
        let is_manual = |ch: &ChannelRef| ch.module_position == 0 && ch.channel == 1;

        let results = runtime.evaluate(&scenario, 1, |_| 1.0, |_| false, is_manual);
        assert!(results.is_empty(), "Scenario write should be blocked by manual override");
    }

    #[test]
    fn test_complex_dependency_chain() {
        // A→B→C→D chain, verify all evaluated in correct order
        let scenario = ReactiveScenario {
            name: "complex".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "a_to_b".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "b_to_c".to_string(),
                    source: Some(ChannelRef::new(0, 1)),
                    target: ChannelRef::new(0, 2),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
                ReactiveBehavior {
                    id: "c_to_d".to_string(),
                    source: Some(ChannelRef::new(0, 2)),
                    target: ChannelRef::new(0, 3),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // All three should be in topo order
        assert_eq!(runtime.graph.topo_order.len(), 3);

        // a_to_b < b_to_c < c_to_d in execution order
        let order: Vec<usize> = runtime.graph.topo_order.clone();
        assert!(order[0] == 0, "a_to_b should be first");
        assert!(order[1] == 1, "b_to_c should be second");
        assert!(order[2] == 2, "c_to_d should be third");
    }

    #[test]
    fn test_delay_pending_cleared_on_deactivate() {
        let scenario = ReactiveScenario {
            name: "delayed".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "delayed_behavior".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 100,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Trigger delayed behavior (source changes)
        let _ = runtime.evaluate(&scenario, 1, |_| 1.0, |_| false, |_| false);

        // Verify pending state is set
        let state = runtime.behavior_states.get("delayed_behavior").unwrap();
        assert!(state.pending_until_tick.is_some());
        assert!(state.pending_value.is_some());

        // Deactivate clears pending
        runtime.on_deactivate();

        let state = runtime.behavior_states.get("delayed_behavior").unwrap();
        assert!(state.pending_until_tick.is_none());
        assert!(state.pending_value.is_none());
    }

    #[test]
    fn test_scaled_mapping_requires_source() {
        // Scaled mapping requires a source channel (like direct/inverted)
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "scaled_no_source".to_string(),
                    source: None, // Missing source!
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Scaled,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let result = validate_scenarios(&[scenario], 1, &[4]);
        assert!(!result.is_valid());
        assert!(result.errors.iter().any(|e| e.message.contains("source")));
    }

    #[test]
    fn test_disabled_behavior_not_evaluated() {
        let scenario = ReactiveScenario {
            name: "test".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "disabled".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Direct,
                    delay_ms: 0,
                    enabled: false, // Disabled!
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();
        let results = runtime.evaluate(&scenario, 1, |_| 1.0, |_| false, |_| false);

        assert!(results.is_empty(), "Disabled behavior should not produce output");
    }

    #[test]
    fn test_get_debug_state_reflects_runtime() {
        let mut manager = ReactiveScenarioManager::new();

        let scenarios = vec![
            ReactiveScenario {
                name: "debug-test".to_string(),
                scenario_type: "reactive".to_string(),
                description: None,
                default: true,
                behaviors: vec![
                    ReactiveBehavior {
                        id: "test_behavior".to_string(),
                        source: Some(ChannelRef::new(0, 0)),
                        target: ChannelRef::new(0, 1),
                        mapping: BehaviorMappingYaml::Direct,
                        delay_ms: 50,
                        enabled: true,
                        value: None,
                    },
                ],
            },
        ];

        manager.load_scenarios(scenarios, 1, &[4]);
        manager.auto_activate_default(10).unwrap();

        let debug_state = manager.get_reactive_debug_state();
        assert_eq!(debug_state.len(), 1);
        assert_eq!(debug_state[0].scenario, "debug-test");
        assert_eq!(debug_state[0].behavior_id, "test_behavior");
        assert_eq!(debug_state[0].delay_ms, 50);
        assert!(debug_state[0].enabled);
    }

    #[test]
    fn test_clear_all_forces() {
        let mut manager = ReactiveScenarioManager::new();

        // Set multiple forces
        manager.set_force(ChannelRef::new(0, 0), 1.0);
        manager.set_force(ChannelRef::new(0, 1), 2.0);
        manager.set_force(ChannelRef::new(1, 0), 3.0);

        assert_eq!(manager.get_forces().len(), 3);

        // Clear all
        manager.clear_all_forces();

        assert_eq!(manager.get_forces().len(), 0);
    }

    #[test]
    fn test_inverted_mapping_boolean() {
        let scenario = ReactiveScenario {
            name: "inverted".to_string(),
            scenario_type: "reactive".to_string(),
            description: None,
            default: false,
            behaviors: vec![
                ReactiveBehavior {
                    id: "invert".to_string(),
                    source: Some(ChannelRef::new(0, 0)),
                    target: ChannelRef::new(0, 1),
                    mapping: BehaviorMappingYaml::Inverted,
                    delay_ms: 0,
                    enabled: true,
                    value: None,
                },
            ],
        };

        let mut runtime = ReactiveScenarioRuntime::new(&scenario, 10).unwrap();

        // Source is 0 (false), inverted should be 1 (true)
        let results = runtime.evaluate(&scenario, 1, |_| 0.0, |_| false, |_| false);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1, 1.0);

        // Source is 1 (true), inverted should be 0 (false)
        let results = runtime.evaluate(&scenario, 2, |_| 1.0, |_| false, |_| false);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1, 0.0);
    }

    #[test]
    fn test_ownership_priority_chain() {
        // Test that clearing higher-priority ownership falls through correctly
        let mut ownership = ChannelOwnership::default();
        ownership.default_value = 0.0;
        ownership.scenario_value = Some(1.0);
        ownership.manual_value = Some(2.0);
        ownership.force = Some(ChannelForce::new(3.0));

        // Force takes precedence
        let (value, source) = ownership.resolve();
        assert_eq!(value, 3.0);
        assert_eq!(source, ValueSource::Force);

        // Clear force, manual takes over
        ownership.force = None;
        let (value, source) = ownership.resolve();
        assert_eq!(value, 2.0);
        assert_eq!(source, ValueSource::Manual);

        // Clear manual, scenario takes over
        ownership.manual_value = None;
        let (value, source) = ownership.resolve();
        assert_eq!(value, 1.0);
        assert!(matches!(source, ValueSource::Scenario { .. }));

        // Clear scenario, default takes over
        ownership.scenario_value = None;
        let (value, source) = ownership.resolve();
        assert_eq!(value, 0.0);
        assert_eq!(source, ValueSource::Default);
    }
}
