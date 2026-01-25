use std::sync::{Arc, Mutex};
use crate::models::{RackConfig, SimulationState, ModuleState};
use crate::modules::{Module, create_module};

pub struct Simulator {
    pub config: Option<RackConfig>,
    pub modules: Vec<Box<dyn Module>>,
    pub simulation_state: SimulationState,
}

impl Simulator {
    pub fn new() -> Self {
        Self {
            config: None,
            modules: Vec::new(),
            simulation_state: SimulationState::Stopped,
        }
    }
    
    pub fn load_rack(&mut self, config: RackConfig) {
        self.modules.clear();
        
        // Sort modules by slot position
        let mut sorted_modules = config.modules.clone();
        sorted_modules.sort_by_key(|m| m.slot_position);
        
        for mod_config in sorted_modules {
            if let Some(module) = create_module(mod_config) {
                self.modules.push(module);
            }
        }
        self.config = Some(config);
    }
    
    pub fn get_module_state(&self, module_id: &str) -> Option<ModuleState> {
        self.modules.iter()
            .find(|m| m.get_id() == module_id)
            .map(|m| m.get_state())
    }
    
    pub fn get_all_module_states(&self) -> Vec<ModuleState> {
        self.modules.iter().map(|m| m.get_state()).collect()
    }
    
    pub fn set_channel_value(&mut self, module_id: &str, channel: u16, value: f64) {
        if let Some(module) = self.modules.iter_mut().find(|m| m.get_id() == module_id) {
            module.set_channel_value(channel, value);
        }
    }
    
    // Modbus Helpers
    
    fn is_digital_input(module_number: &str) -> bool {
        matches!(module_number, "750-1405")
    }
    
    fn is_digital_output(module_number: &str) -> bool {
        matches!(module_number, "750-1504")
    }
    
    fn is_analog_input(module_number: &str) -> bool {
        matches!(module_number, "750-455" | "750-461")
    }
    
    pub fn read_discrete_inputs(&self) -> Vec<bool> {
        let mut bits = Vec::new();
        for module in &self.modules {
            if Self::is_digital_input(module.get_config().module_number.as_str()) {
                let bytes = module.read_inputs();
                // 2 bytes = 16 bits
                for byte in bytes {
                    for i in 0..8 {
                        bits.push((byte & (1 << i)) != 0);
                    }
                }
            }
        }
        bits
    }
    
    pub fn read_coils(&self) -> Vec<bool> {
        let mut bits = Vec::new();
        for module in &self.modules {
            if Self::is_digital_output(module.get_config().module_number.as_str()) {
                let state = module.get_state();
                for ch in state.channels {
                    match ch.value {
                        crate::models::ChannelValue::Bool(b) => bits.push(b),
                        crate::models::ChannelValue::Number(n) => bits.push(n > 0.5),
                    }
                }
            }
        }
        bits
    }
    
    pub fn read_input_registers(&self) -> Vec<u16> {
        let mut words = Vec::new();
        for module in &self.modules {
            if Self::is_analog_input(module.get_config().module_number.as_str()) {
                let bytes = module.read_inputs();
                // Pack bytes into words (Little Endian for WAGO internal sim)
                for chunk in bytes.chunks(2) {
                    if chunk.len() == 2 {
                        let val = (chunk[0] as u16) | ((chunk[1] as u16) << 8);
                        words.push(val);
                    }
                }
            }
        }
        words
    }
    
    pub fn write_coils(&mut self, addr: u16, values: &[bool]) {
        let mut current_addr = 0;
        for module in &mut self.modules {
            if Self::is_digital_output(module.get_config().module_number.as_str()) {
                let output_size = module.get_output_image_size() * 8; // bits
                let module_end = current_addr + output_size as u16;
                
                // Check overlap
                let start = addr;
                let end = addr + values.len() as u16;
                
                if start < module_end && end > current_addr {
                    for (i, &val) in values.iter().enumerate() {
                        let target_addr = start + i as u16;
                        if target_addr >= current_addr && target_addr < module_end {
                            let channel = target_addr - current_addr;
                            module.set_channel_value(channel, if val { 1.0 } else { 0.0 });
                        }
                    }
                }
                
                current_addr = module_end;
            }
        }
    }
    
    pub fn write_holding_registers(&mut self, _addr: u16, _values: &[u16]) {
        // Not implemented
    }
}

pub struct AppState(pub Arc<Mutex<Simulator>>);
