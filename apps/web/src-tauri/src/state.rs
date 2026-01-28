use std::sync::{Arc, Mutex};
use crate::models::{ChannelValue, ConnectionState, ModbusClientInfo, ModuleState, RackConfig, SimulationState};
use crate::modules::{Module, create_module};
use crate::scenario::{Scenario, ScenarioEngine};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Simulator {
    pub config: Option<RackConfig>,
    pub modules: Vec<Box<dyn Module>>,
    pub simulation_state: SimulationState,
    pub last_modbus_activity: u64, // Timestamp in ms
    pub watchdog_timeout: u64, // ms, default 0 (disabled)
    pub holding_registers: Vec<u16>, // General purpose storage for simulation
    pub modbus_clients: HashMap<String, ModbusClientInfo>,
    pub scenario_engine: ScenarioEngine,
    pub available_scenarios: Vec<Scenario>,
}

impl Simulator {
    pub fn new() -> Self {
        Self {
            config: None,
            modules: Vec::new(),
            simulation_state: SimulationState::Stopped,
            last_modbus_activity: 0,
            watchdog_timeout: 0,
            holding_registers: vec![0; 1024], // Initialize 1024 registers
            modbus_clients: HashMap::new(),
            scenario_engine: ScenarioEngine::new(),
            available_scenarios: Vec::new(),
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

    pub fn clear_rack(&mut self) {
        self.config = None;
        self.modules.clear();
        self.simulation_state = SimulationState::Stopped;
        self.holding_registers.fill(0);
        self.scenario_engine.stop();
        self.available_scenarios.clear();
    }

    pub fn load_from_yaml_string(&mut self, yaml_content: &str) -> Result<(), Box<dyn std::error::Error>> {
        let root: crate::sim_config::SimConfigRoot = serde_yaml::from_str(yaml_content)?;
        
        // Load scenarios if present
        if let Some(scenarios) = root.scenarios {
            self.available_scenarios = scenarios;
        } else {
            self.available_scenarios.clear();
        }

        // Take the first rack for MVP
        if let Some(rack_def) = root.racks.first() {
            let mut modules = Vec::new();
            for (i, mod_def) in rack_def.modules.iter().enumerate() {
                let instance = crate::models::ModuleInstance {
                    id: mod_def.id.clone(),
                    module_number: mod_def.model.clone(),
                    slot_position: i as u16,
                    label: Some(mod_def.name.clone()),
                };
                modules.push(instance);
            }
            
            let config = crate::models::RackConfig {
                id: rack_def.id.clone(),
                name: rack_def.name.clone(),
                description: None,
                coupler: crate::models::CouplerConfig {
                    module_number: "750-362".to_string(), // Default coupler
                    ip_address: root.transport.listen.host.clone(),
                    modbus_port: root.transport.listen.port,
                    unit_id: root.transport.unit_id,
                },
                modules,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            };
            
            self.load_rack(config);
        }
        Ok(())
    }
    
    pub fn tick(&mut self) {
        // Run scenario engine tick
        // We have to use a trick here because scenario_engine.tick(self) 
        // would require multiple mutable borrows.
        // Option 1: Move tick logic to Simulator (boring)
        // Option 2: Use internal mutability (not great here)
        // Option 3: Swap out scenario engine (safest for borrow checker)
        
        let mut engine = std::mem::replace(&mut self.scenario_engine, ScenarioEngine::new());
        engine.tick(self);
        self.scenario_engine = engine;

        // Check watchdog
        self.check_watchdog();
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

    pub fn register_modbus_client(&mut self, addr: SocketAddr) -> String {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        let id = format!("client-{}-{}", addr, now);
        let info = ModbusClientInfo::new(id.clone(), addr, now);
        self.modbus_clients.insert(id.clone(), info);
        self.last_modbus_activity = now;
        id
    }

    pub fn note_client_activity(&mut self, client_id: &str) {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        if let Some(client) = self.modbus_clients.get_mut(client_id) {
            client.last_activity = now;
            client.request_count += 1;
        }
        self.last_modbus_activity = now;
    }

    pub fn remove_modbus_client(&mut self, client_id: &str) {
        self.modbus_clients.remove(client_id);
    }

    pub fn get_connection_state(&self) -> ConnectionState {
        let mut clients: Vec<ModbusClientInfo> = self.modbus_clients.values().cloned().collect();
        clients.sort_by(|a, b| a.id.cmp(&b.id));
        ConnectionState {
            modbus_clients: clients,
            last_activity: self.last_modbus_activity,
        }
    }

    pub fn check_watchdog(&mut self) {
        if self.watchdog_timeout == 0 {
            return;
        }
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        if now.saturating_sub(self.last_modbus_activity) > self.watchdog_timeout {
            for module in &mut self.modules {
                if Self::is_digital_output(module.get_config().module_number.as_str()) {
                    for i in 0..16 {
                        module.set_channel_value(i, 0.0);
                    }
                }
            }
        }
    }

    fn append_aligned(bytes: &mut Vec<u8>, data: &[u8], align: usize) {
        bytes.extend_from_slice(data);
        if align > 1 {
            let rem = data.len() % align;
            if rem != 0 {
                bytes.extend(std::iter::repeat(0).take(align - rem));
            }
        }
    }

    fn build_input_image_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        let align = 2;

        for module in &self.modules {
            if Self::is_analog_input(module.get_config().module_number.as_str()) {
                let data = module.read_inputs();
                Self::append_aligned(&mut bytes, &data, align);
            }
        }

        for module in &self.modules {
            if Self::is_digital_input(module.get_config().module_number.as_str()) {
                let data = module.read_inputs();
                Self::append_aligned(&mut bytes, &data, align);
            }
        }

        bytes
    }

    fn output_module_slices(&self) -> (Vec<(usize, usize, usize)>, usize) {
        let mut slices = Vec::new();
        let mut offset = 0usize;
        let align = 2;

        let mut add_module = |index: usize, len: usize| {
            if len == 0 {
                return;
            }
            slices.push((index, offset, len));
            offset += len;
            if align > 1 {
                let rem = len % align;
                if rem != 0 {
                    offset += align - rem;
                }
            }
        };

        for (index, module) in self.modules.iter().enumerate() {
            if Self::is_analog_output(module.get_config().module_number.as_str()) {
                add_module(index, module.get_output_image_size());
            }
        }

        for (index, module) in self.modules.iter().enumerate() {
            if Self::is_digital_output(module.get_config().module_number.as_str()) {
                add_module(index, module.get_output_image_size());
            }
        }

        (slices, offset)
    }

    fn output_image_bytes_from_registers(&self, total_len: usize) -> Vec<u8> {
        let total_words = total_len / 2;
        let mut bytes = Vec::with_capacity(total_len);
        for i in 0..total_words {
            let val = self.holding_registers.get(i).copied().unwrap_or(0);
            bytes.push((val & 0xFF) as u8);
            bytes.push((val >> 8) as u8);
        }
        bytes
    }

    fn write_output_registers_from_bytes(&mut self, bytes: &[u8]) {
        for (i, chunk) in bytes.chunks(2).enumerate() {
            if i >= self.holding_registers.len() {
                break;
            }
            let low = chunk[0] as u16;
            let high = if chunk.len() > 1 { chunk[1] as u16 } else { 0 };
            self.holding_registers[i] = low | (high << 8);
        }
    }

    fn pack_digital_output_bytes(module: &dyn Module, len: usize) -> Vec<u8> {
        let mut bytes = vec![0u8; len];
        let state = module.get_state();
        for channel in state.channels {
            let bit_index = channel.channel as usize;
            let byte_idx = bit_index / 8;
            let bit_idx = bit_index % 8;
            if byte_idx >= len {
                continue;
            }
            let is_on = match channel.value {
                ChannelValue::Bool(val) => val,
                ChannelValue::Number(val) => val > 0.5,
            };
            if is_on {
                bytes[byte_idx] |= 1 << bit_idx;
            }
        }
        bytes
    }

    fn apply_output_registers_to_modules(&mut self) {
        let (slices, total_len) = self.output_module_slices();
        if total_len == 0 {
            return;
        }
        let bytes = self.output_image_bytes_from_registers(total_len);
        for (index, offset, len) in slices {
            if let Some(slice) = bytes.get(offset..offset + len) {
                self.modules[index].write_outputs(slice);
            }
        }
    }

    fn sync_output_registers_from_digital_outputs(&mut self) {
        let (slices, total_len) = self.output_module_slices();
        if total_len == 0 {
            return;
        }
        let mut bytes = self.output_image_bytes_from_registers(total_len);
        for (index, offset, len) in slices {
            if !Self::is_digital_output(self.modules[index].get_config().module_number.as_str()) {
                continue;
            }
            let packed = Self::pack_digital_output_bytes(self.modules[index].as_ref(), len);
            if let Some(target) = bytes.get_mut(offset..offset + len) {
                target.copy_from_slice(&packed);
            }
        }
        self.write_output_registers_from_bytes(&bytes);
    }
    
    // Modbus Helpers
    
    fn is_digital_input(module_number: &str) -> bool {
        matches!(module_number, "750-1405" | "750-1415" | "750-430" | "753-440")
    }
    
    fn is_digital_output(module_number: &str) -> bool {
        matches!(module_number, "750-1504" | "750-1515" | "750-530" | "750-515")
    }
    
    fn is_analog_input(module_number: &str) -> bool {
        // Counters are also Input Registers
        matches!(module_number, "750-455" | "750-454" | "750-461" | "750-464" | "750-404" | "750-633")
    }

    fn is_analog_output(module_number: &str) -> bool {
        // Counters are also Holding Registers (Output)
        matches!(module_number, "750-563" | "750-555" | "750-404" | "750-633")
    }

    /// Encode module ID according to WAGO discovery spec:
    /// - Digital I/O modules: 0x8000 | (channel_count << 8) | (is_output << 1) | is_input
    /// - Analog/Special modules: part number as decimal (e.g., 455 for 750-455)
    fn encode_module_id(module_number: &str) -> u16 {
        // Parse part number from "750-XXX" format
        let part_num = module_number
            .split('-')
            .nth(1)
            .and_then(|s| s.parse::<u16>().ok())
            .unwrap_or(0);

        // Digital I/O modules use special encoding
        match module_number {
            // Digital Inputs
            "750-1405" => 0x8000 | (16 << 8) | 0x01,  // 16-Ch DI: 0x9001
            "750-1415" => 0x8000 | (8 << 8) | 0x01,   // 8-Ch DI: 0x8801
            "750-430"  => 0x8000 | (8 << 8) | 0x01,   // 8-Ch DI: 0x8801
            "753-440"  => 0x8000 | (4 << 8) | 0x01,   // 4-Ch DI: 0x8401
            
            // Digital Outputs
            "750-1504" => 0x8000 | (16 << 8) | 0x02,  // 16-Ch DO: 0x9002
            "750-1515" => 0x8000 | (8 << 8) | 0x02,   // 8-Ch DO: 0x8802
            "750-530"  => 0x8000 | (8 << 8) | 0x02,   // 8-Ch DO: 0x8802
            "750-515"  => 0x8000 | (4 << 8) | 0x02,   // 4-Ch DO: 0x8402
            
            // Analog/Special modules return part number as decimal
            _ => part_num,
        }
    }

    /// Calculate I/O bit counts for registers 0x1022-0x1025
    fn calculate_io_bit_counts(&self) -> (u16, u16, u16, u16) {
        let mut output_analog_bytes = 0u16;
        let mut input_analog_bytes = 0u16;
        let mut output_digital_bits = 0u16;
        let mut input_digital_bits = 0u16;

        for module in &self.modules {
            let module_number = module.get_config().module_number.as_str();
            
            if Self::is_analog_output(module_number) {
                output_analog_bytes += module.get_output_image_size() as u16;
            }
            if Self::is_analog_input(module_number) {
                input_analog_bytes += module.get_input_image_size() as u16;
            }
            if Self::is_digital_output(module_number) {
                output_digital_bits += (module.get_output_image_size() * 8) as u16;
            }
            if Self::is_digital_input(module_number) {
                input_digital_bits += (module.get_input_image_size() * 8) as u16;
            }
        }

        // Return (output_analog_bits, input_analog_bits, output_digital_bits, input_digital_bits)
        // Analog bits = byte_count * 8
        (output_analog_bytes * 8, input_analog_bytes * 8, output_digital_bits, input_digital_bits)
    }
    
    pub fn read_discrete_inputs(&self) -> Vec<bool> {
        let mut bits = Vec::new();
        for module in &self.modules {
            if Self::is_digital_input(module.get_config().module_number.as_str()) {
                let bytes = module.read_inputs();
                // 2 bytes = 16 bits, 1 byte = 8 bits
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
        let bytes = self.build_input_image_bytes();
        let mut words = Vec::new();
        for chunk in bytes.chunks(2) {
            if chunk.len() == 2 {
                let val = (chunk[0] as u16) | ((chunk[1] as u16) << 8);
                words.push(val);
            }
        }
        words
    }

    pub fn read_special_input_registers(&self, addr: u16, cnt: u16) -> Option<Vec<u16>> {
        // Handle WAGO discovery registers (0x1022+, 0x2000+)
        if addr >= 0x1022 && addr <= 0x1025 {
            // I/O Bit Count Registers
            let (output_analog_bits, input_analog_bits, output_digital_bits, input_digital_bits) = 
                self.calculate_io_bit_counts();
            
            let mut result = Vec::new();
            for i in 0..cnt {
                let val = match addr + i {
                    0x1022 => output_analog_bits,
                    0x1023 => input_analog_bits,
                    0x1024 => output_digital_bits,
                    0x1025 => input_digital_bits,
                    _ => 0,
                };
                result.push(val);
            }
            return Some(result);
        }
        
        if addr >= 0x2000 {
            let mut result = Vec::new();
            for i in 0..cnt {
                let reg_addr = addr + i;
                let val = match reg_addr {
                    0x2010 => 0x0100, // FW Version 1.0
                    0x2011 => 0x0750, // Series 750
                    0x2012 => {
                        // Return coupler part number
                        if let Some(ref config) = self.config {
                            let coupler = &config.coupler.module_number;
                            coupler.split('-')
                                .nth(1)
                                .and_then(|s| s.parse::<u16>().ok())
                                .unwrap_or(362)
                        } else {
                            362 // Default to 750-362
                        }
                    },
                    // Module Discovery Registers (Batch 0-3)
                    0x2030 => {
                        // First register is always coupler
                        if let Some(ref config) = self.config {
                            let coupler = &config.coupler.module_number;
                            coupler.split('-')
                                .nth(1)
                                .and_then(|s| s.parse::<u16>().ok())
                                .unwrap_or(362)
                        } else {
                            362
                        }
                    },
                    a if a >= 0x2031 && a <= 0x2070 => {
                        // Batch 0: 0x2031-0x2070 (indices 1-64 for modules)
                        let module_idx = (a - 0x2031) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0 // End of rack / empty slot
                        }
                    },
                    a if a >= 0x2071 && a <= 0x20AE => {
                        // Batch 1: 0x2071-0x20AE (64 modules)
                        let module_idx = 64 + (a - 0x2071) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
                        }
                    },
                    a if a >= 0x20AF && a <= 0x20EC => {
                        // Batch 2: 0x20AF-0x20EC (64 modules)
                        let module_idx = 128 + (a - 0x20AF) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
                        }
                    },
                    a if a >= 0x20ED && a <= 0x2129 => {
                        // Batch 3: 0x20ED-0x2129 (63 modules)
                        let module_idx = 192 + (a - 0x20ED) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
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

    // General Holding Register Read (Watchdog + Discovery + AO + General Storage)
    pub fn read_holding_registers(&self, addr: u16, cnt: u16) -> Vec<u16> {
        // Handle WAGO discovery registers (0x1022+, 0x2000+) via Holding Registers (FC3)
        if addr >= 0x1022 && addr <= 0x1025 {
            // I/O Bit Count Registers
            let (output_analog_bits, input_analog_bits, output_digital_bits, input_digital_bits) = 
                self.calculate_io_bit_counts();
            
            let mut result = Vec::new();
            for i in 0..cnt {
                let val = match addr + i {
                    0x1022 => output_analog_bits,
                    0x1023 => input_analog_bits,
                    0x1024 => output_digital_bits,
                    0x1025 => input_digital_bits,
                    _ => 0,
                };
                result.push(val);
            }
            return result;
        }
        
        if addr >= 0x2000 {
            let mut result = Vec::new();
            for i in 0..cnt {
                let reg_addr = addr + i;
                let val = match reg_addr {
                    0x2010 => 0x0100, // FW Version 1.0
                    0x2011 => 0x0750, // Series 750
                    0x2012 => {
                        // Return coupler part number
                        if let Some(ref config) = self.config {
                            let coupler = &config.coupler.module_number;
                            coupler.split('-')
                                .nth(1)
                                .and_then(|s| s.parse::<u16>().ok())
                                .unwrap_or(362)
                        } else {
                            362 // Default to 750-362
                        }
                    },
                    // Module Discovery Registers (Batch 0-3)
                    0x2030 => {
                        // First register is always coupler
                        if let Some(ref config) = self.config {
                            let coupler = &config.coupler.module_number;
                            coupler.split('-')
                                .nth(1)
                                .and_then(|s| s.parse::<u16>().ok())
                                .unwrap_or(362)
                        } else {
                            362
                        }
                    },
                    a if a >= 0x2031 && a <= 0x2070 => {
                        // Batch 0: 0x2031-0x2070 (indices 1-64 for modules)
                        let module_idx = (a - 0x2031) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0 // End of rack / empty slot
                        }
                    },
                    a if a >= 0x2071 && a <= 0x20AE => {
                        // Batch 1: 0x2071-0x20AE (64 modules)
                        let module_idx = 64 + (a - 0x2071) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
                        }
                    },
                    a if a >= 0x20AF && a <= 0x20EC => {
                        // Batch 2: 0x20AF-0x20EC (64 modules)
                        let module_idx = 128 + (a - 0x20AF) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
                        }
                    },
                    a if a >= 0x20ED && a <= 0x2129 => {
                        // Batch 3: 0x20ED-0x2129 (63 modules)
                        let module_idx = 192 + (a - 0x20ED) as usize;
                        if module_idx < self.modules.len() {
                            let module_number = &self.modules[module_idx].get_config().module_number;
                            Self::encode_module_id(module_number)
                        } else {
                            0
                        }
                    },
                    _ => 0
                };
                result.push(val);
            }
            return result;
        }
        
        // Handle Input Process Image at address 0 (DI + AI data)
        if addr == 0 {
            // Return input process image as holding registers (FC3)
            // This matches the C++ implementation where address 0 returns the input process image
            let all_input_regs = self.read_input_registers();
            return all_input_regs.iter().take(cnt as usize).copied().collect();
        }
        
        // Standard holding registers
        let mut result = Vec::new();
        for i in 0..cnt {
            let reg_addr = addr + i;
            match reg_addr {
                0x1000 => result.push(self.watchdog_timeout as u16),
                0x1003 => result.push(0), // Watchdog trigger (write-only, returns 0)
                0x1009 => result.push(0), // Socket close config (returns stored value or 0)
                _ => {
                    // Return from general storage
                    if (reg_addr as usize) < self.holding_registers.len() {
                        result.push(self.holding_registers[reg_addr as usize]);
                    } else {
                        result.push(0);
                    }
                }
            }
        }
        result
    }
    
    pub fn write_coils(&mut self, addr: u16, values: &[bool]) {
        let mut current_addr = 0;
        for module in &mut self.modules {
            if Self::is_digital_output(module.get_config().module_number.as_str()) {
                let output_size = module.get_output_image_size() * 8; // bits
                let module_end = current_addr + output_size as u16;
                
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
        self.sync_output_registers_from_digital_outputs();
    }
    
    pub fn write_holding_registers(&mut self, addr: u16, values: &[u16]) {
        // Also update AO modules!
        // We need to map addr to AO module channels.
        // Assuming AO starts at 0.
        let mut current_ao_addr = 0;
        
        for (i, &val) in values.iter().enumerate() {
            let reg_addr = addr + i as u16;
            
            match reg_addr {
                // Watchdog timeout configuration
                0x1000 => {
                    self.watchdog_timeout = val as u64;
                    self.touch_watchdog();
                },
                // Watchdog trigger (any write resets watchdog)
                0x1003 => {
                    self.touch_watchdog();
                },
                // Socket close on watchdog config
                0x1009 => {
                    if (reg_addr as usize) < self.holding_registers.len() {
                        self.holding_registers[reg_addr as usize] = val;
                    }
                },
                // General storage
                _ => {
                    if (reg_addr as usize) < self.holding_registers.len() {
                        self.holding_registers[reg_addr as usize] = val;
                    }
                }
            }
        }
        
        // Update AO modules
        // This iterates all AO modules and updates them based on the written values
        // We need to check if the written range overlaps with AO map
        let write_start = addr;
        let write_end = addr + values.len() as u16;
        
        for module in &mut self.modules {
            if Self::is_analog_output(module.get_config().module_number.as_str()) {
                let output_len = module.get_output_image_size(); // bytes
                let output_words = output_len / 2; // registers
                let module_end = current_ao_addr + output_words as u16;
                
                if write_start < module_end && write_end > current_ao_addr {
                    // Overlap
                    // Construct byte buffer for module
                    let mut bytes = vec![0u8; output_len];
                    // We only have u16 values.
                    // We need to see which registers overlap
                    
                    for w in 0..output_words {
                        let word_addr = current_ao_addr + w as u16;
                        if word_addr >= write_start && word_addr < write_end {
                            let val_idx = (word_addr - write_start) as usize;
                            let val = values[val_idx];
                            bytes[w*2] = (val & 0xFF) as u8;
                            bytes[w*2+1] = (val >> 8) as u8;
                        } else {
                            // If we didn't write to this register, we should technically keep old value.
                            // But `write_outputs` takes full buffer.
                            // We should probably rely on `holding_registers` as the "current state" source?
                            // Yes, let's read from holding_registers to fill the buffer.
                            let val = if (word_addr as usize) < self.holding_registers.len() {
                                self.holding_registers[word_addr as usize]
                            } else { 0 };
                            bytes[w*2] = (val & 0xFF) as u8;
                            bytes[w*2+1] = (val >> 8) as u8;
                        }
                    }
                    module.write_outputs(&bytes);
                }
                
                current_ao_addr = module_end;
            }
        }

        self.apply_output_registers_to_modules();
    }
}

pub struct AppState(pub Arc<Mutex<Simulator>>);
