use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use crate::state::Simulator;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScenarioAction {
    Set,
    Ramp,
    Pulse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioStep {
    #[serde(alias = "time_offset_ms")]
    pub time_offset_ms: u64,
    #[serde(alias = "module_position")]
    pub module_position: usize,
    pub channel: u16,
    pub action: ScenarioAction,
    pub value: f64,
    #[serde(alias = "duration_ms")]
    pub duration_ms: Option<u64>,
    #[serde(alias = "end_value")]
    pub end_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scenario {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    #[serde(alias = "loop_enabled")]
    pub loop_enabled: bool,
    pub steps: Vec<ScenarioStep>,
}

#[derive(Debug, Clone)]
struct ActiveRamp {
    module_position: usize,
    channel: u16,
    start_value: f64,
    target_value: f64,
    start_time: Instant,
    duration: Duration,
}

#[derive(Debug, Clone)]
struct ActivePulse {
    module_position: usize,
    channel: u16,
    original_value: f64,
    end_time: Instant,
}

pub struct ScenarioEngine {
    pub running: bool,
    pub start_time: Option<Instant>,
    pub current_step_index: usize,
    pub loaded_scenario: Option<Scenario>,
    active_ramps: Vec<ActiveRamp>,
    active_pulses: Vec<ActivePulse>,
}

impl ScenarioEngine {
    pub fn new() -> Self {
        Self {
            running: false,
            start_time: None,
            current_step_index: 0,
            loaded_scenario: None,
            active_ramps: Vec::new(),
            active_pulses: Vec::new(),
        }
    }

    pub fn load_scenario(&mut self, scenario: Scenario) {
        self.stop();
        self.loaded_scenario = Some(scenario);
    }

    pub fn play(&mut self) {
        if self.loaded_scenario.is_some() {
            self.running = true;
            self.start_time = Some(Instant::now());
            self.current_step_index = 0;
            self.active_ramps.clear();
            self.active_pulses.clear();
        }
    }

    pub fn stop(&mut self) {
        self.running = false;
        self.start_time = None;
        self.current_step_index = 0;
        self.active_ramps.clear();
        self.active_pulses.clear();
    }

    pub fn tick(&mut self, simulator: &mut Simulator) {
        if !self.running {
            return;
        }

        let start_time = match self.start_time {
            Some(t) => t,
            None => return,
        };

        let elapsed = start_time.elapsed();
        let elapsed_ms = elapsed.as_millis() as u64;

        // Process steps
        loop {
            let step = if let Some(scenario) = &self.loaded_scenario {
                if self.current_step_index < scenario.steps.len() {
                    let step = &scenario.steps[self.current_step_index];
                    if step.time_offset_ms <= elapsed_ms {
                        Some(step.clone())
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(s) = step {
                self.execute_step(&s, simulator);
                self.current_step_index += 1;
            } else {
                break;
            }
        }

        // Check for loop or finish
        let mut loop_triggered = false;
        let mut finished = false;
        if let Some(scenario) = &self.loaded_scenario {
            if self.current_step_index >= scenario.steps.len() {
                if scenario.loop_enabled {
                    loop_triggered = true;
                } else if self.active_ramps.is_empty() && self.active_pulses.is_empty() {
                    finished = true;
                }
            }
        }

        if loop_triggered {
            self.current_step_index = 0;
            self.start_time = Some(Instant::now());
            self.active_ramps.clear();
            self.active_pulses.clear();
        } else if finished {
            self.running = false;
        }

        // Process active ramps
        let mut i = 0;
        while i < self.active_ramps.len() {
            let ramp = &self.active_ramps[i];
            let ramp_elapsed = ramp.start_time.elapsed();
            
            if ramp_elapsed >= ramp.duration {
                // Ramp finished
                self.set_simulator_value(simulator, ramp.module_position, ramp.channel, ramp.target_value);
                self.active_ramps.remove(i);
            } else {
                // Interpolate
                let progress = ramp_elapsed.as_secs_f64() / ramp.duration.as_secs_f64();
                let current_val = ramp.start_value + (ramp.target_value - ramp.start_value) * progress;
                self.set_simulator_value(simulator, ramp.module_position, ramp.channel, current_val);
                i += 1;
            }
        }

        // Process active pulses
        let now = Instant::now();
        let mut i = 0;
        while i < self.active_pulses.len() {
            let pulse = &self.active_pulses[i];
            if now >= pulse.end_time {
                // Pulse finished, revert value
                self.set_simulator_value(simulator, pulse.module_position, pulse.channel, pulse.original_value);
                self.active_pulses.remove(i);
            } else {
                i += 1;
            }
        }
    }

    fn execute_step(&mut self, step: &ScenarioStep, simulator: &mut Simulator) {
        match step.action {
            ScenarioAction::Set => {
                self.set_simulator_value(simulator, step.module_position, step.channel, step.value);
            }
            ScenarioAction::Ramp => {
                if let Some(duration_ms) = step.duration_ms {
                    let start_val = self.get_simulator_value(simulator, step.module_position, step.channel);
                    self.active_ramps.push(ActiveRamp {
                        module_position: step.module_position,
                        channel: step.channel,
                        start_value: start_val,
                        target_value: step.value,
                        start_time: Instant::now(),
                        duration: Duration::from_millis(duration_ms),
                    });
                }
            }
            ScenarioAction::Pulse => {
                if let Some(duration_ms) = step.duration_ms {
                    let original_val = self.get_simulator_value(simulator, step.module_position, step.channel);
                    self.set_simulator_value(simulator, step.module_position, step.channel, step.value);
                    self.active_pulses.push(ActivePulse {
                        module_position: step.module_position,
                        channel: step.channel,
                        original_value: original_val,
                        end_time: Instant::now() + Duration::from_millis(duration_ms),
                    });
                }
            }
        }
    }

    fn get_simulator_value(&self, simulator: &Simulator, module_pos: usize, channel: u16) -> f64 {
        if let Some(module) = simulator.modules.get(module_pos) {
            let state = module.get_state();
            if let Some(ch_state) = state.channels.get(channel as usize) {
                return match ch_state.value {
                    crate::models::ChannelValue::Bool(b) => if b { 1.0 } else { 0.0 },
                    crate::models::ChannelValue::Number(n) => n,
                };
            }
        }
        0.0
    }

    fn set_simulator_value(&self, simulator: &mut Simulator, module_pos: usize, channel: u16, value: f64) {
        if let Some(module) = simulator.modules.get_mut(module_pos) {
            module.set_channel_value(channel, value);
        }
    }
}
