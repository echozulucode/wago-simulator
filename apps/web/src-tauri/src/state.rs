use std::sync::{Arc, Mutex};
use crate::models::{RackConfig, SimulationState, ModuleState};
use crate::modules::{Module, create_module};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Simulator {
    pub config: Option<RackConfig>,
    pub modules: Vec<Box<dyn Module>>,
    pub simulation_state: SimulationState,
    pub last_modbus_activity: u64, // Timestamp in ms
    pub watchdog_timeout: u64, // ms, default 0 (disabled)
}

impl Simulator {
    pub fn new() -> Self {
        Self {
            config: None,
            modules: Vec::new(),
            simulation_state: SimulationState::Stopped,
            last_modbus_activity: 0,
            watchdog_timeout: 0,
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

    pub fn touch_watchdog(&mut self) {
        self.last_modbus_activity = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
    }

    pub fn check_watchdog(&mut self) {
        if self.watchdog_timeout == 0 {
            return;
        }
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        if now.saturating_sub(self.last_modbus_activity) > self.watchdog_timeout {
            // Timeout! Zero outputs.
            // Loop through DO modules and set to 0.
            // Loop through AO modules and set to 0 (if any).
            // Currently AO modules (750-455 is INPUT) don't have outputs.
            // 750-1504 is Digital Output.
            for module in &mut self.modules {
                if Self::is_digital_output(module.get_config().module_number.as_str()) {
                    // Set all 16 channels to 0
                    for i in 0..16 {
                        module.set_channel_value(i, 0.0);
                    }
                }
            }
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
        // Normal I/O area
        let mut words = Vec::new();
        for module in &self.modules {
            if Self::is_analog_input(module.get_config().module_number.as_str()) {
                let bytes = module.read_inputs();
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

    // Special handler for addressing beyond standard range (Metadata)
    pub fn read_special_input_registers(&self, addr: u16, cnt: u16) -> Option<Vec<u16>> {
        // WAGO Metadata Area starting at 0x2000
        if addr >= 0x2000 {
            let mut result = Vec::new();
            for i in 0..cnt {
                let reg_addr = addr + i;
                let val = match reg_addr {
                    // Firmware/Series (Dummy)
                    0x2010 => 0x0100, // FW Version 1.0
                    0x2011 => 0x0750, // Series 750
                    0x2012 => 0x0362, // Coupler 362
                    
                    // Module Description Table (0x2030+)
                    a if a >= 0x2030 => {
                        let module_idx = (a - 0x2030) as usize;
                        if module_idx < self.modules.len() {
                            let mod_num_str = &self.modules[module_idx].get_config().module_number;
                            // Parse "750-1405" -> 1405
                            if let Some(suffix) = mod_num_str.split('-').nth(1) {
                                suffix.parse::<u16>().unwrap_or(0)
                            } else {
                                0
                            }
                        } else {
                            0 // End of list
                        }
                    },
                    _ => 0
                };
                result.push(val);
            }
            return Some(result);
        }
        None
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
    
    pub fn write_holding_registers(&mut self, addr: u16, values: &[u16]) {
        // Watchdog config at 0x1000
        if addr == 0x1000 && values.len() >= 1 {
            self.watchdog_timeout = values[0] as u64;
            // Also reset timer
            self.touch_watchdog();
        }
    }
}

pub struct AppState(pub Arc<Mutex<Simulator>>);
