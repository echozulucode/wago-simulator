use std::sync::{Arc, Mutex};
use crate::models::{ChannelValue, ConnectionState, ModbusClientInfo, ModuleState, RackConfig, SimulationState};
use crate::modules::{Module, create_module};
use crate::scenario::{Scenario, ScenarioEngine};
use crate::reactive::{ReactiveScenarioManager, ChannelRef};
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
    /// Reactive scenario manager (continuous I/O behaviors)
    pub reactive_manager: ReactiveScenarioManager,
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
            reactive_manager: ReactiveScenarioManager::new(),
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
        self.reactive_manager = ReactiveScenarioManager::new();
    }

    pub fn load_from_yaml_string(&mut self, yaml_content: &str) -> Result<(), Box<dyn std::error::Error>> {
        let root: crate::sim_config::SimConfigRoot = serde_yaml::from_str(yaml_content)?;

        // Load scripted scenarios if present
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

        // Load and validate reactive scenarios
        if let Some(reactive_scenarios) = root.reactive_scenarios {
            // Get channel counts for validation
            let module_count = self.modules.len();
            let channel_counts: Vec<usize> = self.modules
                .iter()
                .map(|m| m.get_state().channels.len())
                .collect();

            self.reactive_manager.load_scenarios(
                reactive_scenarios,
                module_count,
                &channel_counts,
            );

            // Auto-activate the default scenario if one exists
            // Using 100ms tick rate (matching the simulation tick rate)
            if let Err(e) = self.reactive_manager.auto_activate_default(100) {
                eprintln!("Warning: Failed to auto-activate default reactive scenario: {}", e);
            }
        } else {
            // Clear reactive manager if no reactive scenarios
            self.reactive_manager = ReactiveScenarioManager::new();
        }

        Ok(())
    }
    
    pub fn tick(&mut self) {
        // Run scripted scenario engine tick
        // We have to use a trick here because scenario_engine.tick(self)
        // would require multiple mutable borrows.
        // Option 1: Move tick logic to Simulator (boring)
        // Option 2: Use internal mutability (not great here)
        // Option 3: Swap out scenario engine (safest for borrow checker)

        let mut engine = std::mem::replace(&mut self.scenario_engine, ScenarioEngine::new());
        engine.tick(self);
        self.scenario_engine = engine;

        // Tick the reactive scenario manager (increments tick counter)
        self.reactive_manager.tick();

        // Phase 2: Evaluate reactive scenario behaviors
        // The evaluation order per plan:
        // 1. Read Modbus outputs (controller writes) - already done by server
        // 2. Apply reactive scenario (deterministic graph evaluation)
        // 3. Apply manual GUI actions
        // 4. Apply force overrides
        // 5. Commit values to process image

        // Step 2: Evaluate reactive scenario and collect values to apply
        let reactive_updates = self.evaluate_reactive_scenario();

        // Step 3-5: Apply updates respecting ownership precedence
        for (channel_ref, value, _behavior_id) in reactive_updates {
            // Check if channel is blocked by force or manual override
            if self.reactive_manager.is_forced(&channel_ref) {
                continue; // Force takes precedence
            }
            if self.reactive_manager.has_manual_override(&channel_ref) {
                continue; // Manual takes precedence over scenario
            }

            // Apply the value to the module
            if let Some(module) = self.modules.get_mut(channel_ref.module_position) {
                module.set_channel_value(channel_ref.channel, value);
            }
        }

        // Apply force overrides (highest priority)
        for force_info in self.reactive_manager.get_forces() {
            if let Some(module) = self.modules.get_mut(force_info.module_position) {
                module.set_channel_value(force_info.channel as u16, force_info.value);
            }
        }

        // Check watchdog
        self.check_watchdog();
    }

    /// Helper: Evaluate active reactive scenario and return values to apply
    fn evaluate_reactive_scenario(&mut self) -> Vec<(ChannelRef, f64, String)> {
        // We need to work around borrow checker issues similar to scenario_engine
        // Collect current channel values first
        let channel_values: HashMap<(usize, u16), f64> = self.modules
            .iter()
            .enumerate()
            .flat_map(|(pos, module)| {
                let state = module.get_state();
                state.channels.into_iter().map(move |ch| {
                    let value = match ch.value {
                        ChannelValue::Bool(b) => if b { 1.0 } else { 0.0 },
                        ChannelValue::Number(n) => n,
                    };
                    ((pos, ch.channel), value)
                })
            })
            .collect();

        // Swap out the reactive manager to avoid borrow issues
        let mut manager = std::mem::replace(&mut self.reactive_manager, ReactiveScenarioManager::new());

        let get_channel_value = |ch: &ChannelRef| {
            channel_values.get(&(ch.module_position, ch.channel)).copied().unwrap_or(0.0)
        };

        let results = manager.evaluate_active_scenario(get_channel_value);

        // Swap back
        self.reactive_manager = manager;

        results
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
        // First, collect module positions for digital outputs
        let do_module_positions: Vec<usize> = self.modules
            .iter()
            .enumerate()
            .filter(|(_, m)| Self::is_digital_output(m.get_config().module_number.as_str()))
            .map(|(i, _)| i)
            .collect();

        for module_pos in do_module_positions {
            let module = &mut self.modules[module_pos];
            let output_size = module.get_output_image_size() * 8; // bits
            let module_end = current_addr + output_size as u16;

            let start = addr;
            let end = addr + values.len() as u16;

            if start < module_end && end > current_addr {
                for (i, &val) in values.iter().enumerate() {
                    let target_addr = start + i as u16;
                    if target_addr >= current_addr && target_addr < module_end {
                        let channel = target_addr - current_addr;
                        let channel_ref = ChannelRef::new(module_pos, channel);
                        let write_value = if val { 1.0 } else { 0.0 };

                        // Check if channel is forced - record shadow write instead
                        if self.reactive_manager.is_forced(&channel_ref) {
                            self.reactive_manager.record_shadow_write(&channel_ref, write_value);
                            // Don't actually apply the value - force takes precedence
                        } else {
                            self.modules[module_pos].set_channel_value(channel, write_value);
                        }
                    }
                }
            }

            current_addr = module_end;
        }
        self.sync_output_registers_from_digital_outputs();
    }
    
    pub fn write_holding_registers(&mut self, addr: u16, values: &[u16]) {
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

        // Collect AO module positions and their register ranges
        let ao_modules: Vec<(usize, usize, u16, u16)> = {
            let mut result = Vec::new();
            let mut ao_addr = 0u16;
            for (idx, module) in self.modules.iter().enumerate() {
                if Self::is_analog_output(module.get_config().module_number.as_str()) {
                    let output_len = module.get_output_image_size();
                    let output_words = (output_len / 2) as u16;
                    result.push((idx, output_len, ao_addr, ao_addr + output_words));
                    ao_addr += output_words;
                }
            }
            result
        };

        for (module_pos, output_len, module_start, module_end) in ao_modules {
            if write_start < module_end && write_end > module_start {
                // Overlap - construct byte buffer for module
                let mut bytes = vec![0u8; output_len];
                let output_words = output_len / 2;

                // For AO modules, typically 1 word = 1 channel (16-bit value)
                for w in 0..output_words {
                    let word_addr = module_start + w as u16;
                    let channel = w as u16; // Channel corresponds to word index
                    let channel_ref = ChannelRef::new(module_pos, channel);

                    // Determine the value to write
                    let val = if word_addr >= write_start && word_addr < write_end {
                        // This register is being written
                        let val_idx = (word_addr - write_start) as usize;
                        values[val_idx]
                    } else {
                        // Not being written, keep old value from holding registers
                        if (word_addr as usize) < self.holding_registers.len() {
                            self.holding_registers[word_addr as usize]
                        } else { 0 }
                    };

                    // Check if this channel is forced
                    if self.reactive_manager.is_forced(&channel_ref) {
                        // Record the shadow write (what PLC tried to write)
                        if word_addr >= write_start && word_addr < write_end {
                            self.reactive_manager.record_shadow_write(&channel_ref, val as f64);
                        }
                        // Use the forced value instead
                        if let Some(forced_val) = self.reactive_manager.get_forced_value(&channel_ref) {
                            let forced_u16 = forced_val as u16;
                            bytes[w*2] = (forced_u16 & 0xFF) as u8;
                            bytes[w*2+1] = (forced_u16 >> 8) as u8;
                        } else {
                            bytes[w*2] = (val & 0xFF) as u8;
                            bytes[w*2+1] = (val >> 8) as u8;
                        }
                    } else {
                        // Not forced, apply normally
                        bytes[w*2] = (val & 0xFF) as u8;
                        bytes[w*2+1] = (val >> 8) as u8;
                    }
                }
                self.modules[module_pos].write_outputs(&bytes);
            }
        }

        self.apply_output_registers_to_modules();
    }
}

pub struct AppState(pub Arc<Mutex<Simulator>>);
