use crate::models::{ChannelState, ModuleInstance, ModuleState, ChannelValue};
use std::time::{SystemTime, UNIX_EPOCH};

pub trait Module: Send + Sync {
    fn get_id(&self) -> &str;
    fn get_config(&self) -> &ModuleInstance;
    fn get_state(&self) -> ModuleState;

    fn set_channel_value(&mut self, channel: u16, value: f64);

    // Process Image
    fn get_input_image_size(&self) -> usize; // in bytes (internal bus)
    fn get_output_image_size(&self) -> usize; // in bytes
    fn read_inputs(&self) -> Vec<u8>;
    fn write_outputs(&mut self, data: &[u8]);
}

fn current_time_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// --- Digital Input Module (Generic) ---
pub struct DigitalInputModule {
    config: ModuleInstance,
    channels: Vec<bool>,
    channel_count: usize,
}

impl DigitalInputModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            channels: vec![false; channel_count],
            channel_count,
        }
    }
}

impl Module for DigitalInputModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        let channels = self.channels.iter().enumerate().map(|(i, &val)| {
            ChannelState {
                channel: i as u16,
                value: ChannelValue::Bool(val),
                raw_value: if val { 1 } else { 0 },
                fault: None,
                status: 0,
                override_active: false,
            }
        }).collect();

        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if (channel as usize) < self.channels.len() {
            self.channels[channel as usize] = value > 0.5;
        }
    }

    fn get_input_image_size(&self) -> usize {
        (self.channel_count + 7) / 8 // Ceil div
    }

    fn get_output_image_size(&self) -> usize {
        0
    }

    fn read_inputs(&self) -> Vec<u8> {
        let size = self.get_input_image_size();
        let mut bytes = vec![0u8; size];
        for (i, &val) in self.channels.iter().enumerate() {
            if val {
                let byte_idx = i / 8;
                let bit_idx = i % 8;
                bytes[byte_idx] |= 1 << bit_idx;
            }
        }
        bytes
    }

    fn write_outputs(&mut self, _data: &[u8]) {
    }
}

// --- Digital Output Module (Generic) ---
pub struct DigitalOutputModule {
    config: ModuleInstance,
    channels: Vec<bool>,
    channel_count: usize,
}

impl DigitalOutputModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            channels: vec![false; channel_count],
            channel_count,
        }
    }
}

impl Module for DigitalOutputModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        let channels = self.channels.iter().enumerate().map(|(i, &val)| {
            ChannelState {
                channel: i as u16,
                value: ChannelValue::Bool(val),
                raw_value: if val { 1 } else { 0 },
                fault: None,
                status: 0,
                override_active: false,
            }
        }).collect();

        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if (channel as usize) < self.channels.len() {
            self.channels[channel as usize] = value > 0.5;
        }
    }

    fn get_input_image_size(&self) -> usize {
        0
    }

    fn get_output_image_size(&self) -> usize {
        (self.channel_count + 7) / 8
    }

    fn read_inputs(&self) -> Vec<u8> {
        vec![]
    }

    fn write_outputs(&mut self, data: &[u8]) {
        if data.is_empty() { return; }
        for i in 0..self.channel_count {
            let byte_idx = i / 8;
            let bit_idx = i % 8;
            if byte_idx < data.len() {
                self.channels[i] = (data[byte_idx] & (1 << bit_idx)) != 0;
            }
        }
    }
}

// --- Analog Input Module (Generic) ---
pub struct AnalogInputModule {
    config: ModuleInstance,
    values: Vec<f64>, // mA or Volts
    channel_count: usize,
}

impl AnalogInputModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            values: vec![0.0; channel_count],
            channel_count,
        }
    }

    fn value_to_raw(&self, val: f64) -> u16 {
        if self.config.module_number.contains("455") || self.config.module_number.contains("454") {
             // 4-20mA
             if val < 4.0 { return 0; }
             let norm = (val - 4.0) / 16.0;
             let raw = (norm * 32767.0) as i32;
             return raw.clamp(0, 32767) as u16;
        }
        // Default linear 0-10
        let norm = val / 10.0;
        let raw = (norm * 32767.0) as i32;
        raw.clamp(0, 32767) as u16
    }
}

impl Module for AnalogInputModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        let channels = self.values.iter().enumerate().map(|(i, &val)| {
            ChannelState {
                channel: i as u16,
                value: ChannelValue::Number(val),
                raw_value: self.value_to_raw(val),
                fault: None,
                status: 0,
                override_active: false,
            }
        }).collect();

        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if (channel as usize) < self.values.len() {
            self.values[channel as usize] = value;
        }
    }

    fn get_input_image_size(&self) -> usize {
        self.channel_count * 2
    }

    fn get_output_image_size(&self) -> usize {
        0
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.channel_count * 2);
        for &val in &self.values {
            let raw = self.value_to_raw(val);
            bytes.push((raw & 0xFF) as u8);
            bytes.push((raw >> 8) as u8);
        }
        bytes
    }

    fn write_outputs(&mut self, _data: &[u8]) {
    }
}

// --- Analog Output Module (Generic) ---
pub struct AnalogOutputModule {
    config: ModuleInstance,
    values: Vec<f64>,
    channel_count: usize,
}

impl AnalogOutputModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            values: vec![0.0; channel_count],
            channel_count,
        }
    }
    
    fn raw_to_value(&self, raw: u16) -> f64 {
        let norm = raw as f64 / 32767.0;
        if self.config.module_number.contains("563") {
            return 4.0 + (norm * 16.0);
        }
        // Default 0-10V
        norm * 10.0
    }
}

impl Module for AnalogOutputModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        let channels = self.values.iter().enumerate().map(|(i, &val)| {
            ChannelState {
                channel: i as u16,
                value: ChannelValue::Number(val),
                raw_value: 0, // TODO: reverse calc if needed
                fault: None,
                status: 0,
                override_active: false,
            }
        }).collect();

        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if (channel as usize) < self.values.len() {
            self.values[channel as usize] = value;
        }
    }

    fn get_input_image_size(&self) -> usize {
        0
    }

    fn get_output_image_size(&self) -> usize {
        self.channel_count * 2
    }

    fn read_inputs(&self) -> Vec<u8> {
        vec![]
    }

    fn write_outputs(&mut self, data: &[u8]) {
        for (i, chunk) in data.chunks(2).enumerate() {
            if i < self.channel_count && chunk.len() == 2 {
                let raw = (chunk[0] as u16) | ((chunk[1] as u16) << 8);
                self.values[i] = self.raw_to_value(raw);
            }
        }
    }
}

// --- RTD Input Module (750-461, 464) ---
pub struct RTDModule {
    config: ModuleInstance,
    temperatures: Vec<f64>,
    channel_count: usize,
}

impl RTDModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            temperatures: vec![20.0; channel_count],
            channel_count,
        }
    }

    fn temp_to_raw(&self, temp: f64) -> u16 {
        let val = (temp + 200.0) * 10.0;
        val.round().clamp(0.0, 65535.0) as u16
    }
}

impl Module for RTDModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        let channels = self.temperatures.iter().enumerate().map(|(i, &val)| {
            ChannelState {
                channel: i as u16,
                value: ChannelValue::Number(val),
                raw_value: self.temp_to_raw(val),
                fault: None,
                status: 0,
                override_active: false,
            }
        }).collect();

        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if (channel as usize) < self.temperatures.len() {
            self.temperatures[channel as usize] = value;
        }
    }

    fn get_input_image_size(&self) -> usize {
        self.channel_count * 2 
    }

    fn get_output_image_size(&self) -> usize {
        0
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.channel_count * 2);
        for &val in &self.temperatures {
            let raw = self.temp_to_raw(val);
            bytes.push((raw & 0xFF) as u8);
            bytes.push((raw >> 8) as u8);
        }
        bytes
    }

    fn write_outputs(&mut self, _data: &[u8]) {
    }
}

// --- Counter Module (750-404, 633) ---
pub struct CounterModule {
    config: ModuleInstance,
    count: u32,
    status: u8,
    control: u8,
    preset: u32,
    channel_count: usize, // Typically 1 or 2 logical counters for simplicity, though physical has more
}

impl CounterModule {
    pub fn new(config: ModuleInstance, channel_count: usize) -> Self {
        Self {
            config,
            count: 0,
            status: 0,
            control: 0,
            preset: 0,
            channel_count,
        }
    }
}

impl Module for CounterModule {
    fn get_id(&self) -> &str {
        &self.config.id
    }

    fn get_config(&self) -> &ModuleInstance {
        &self.config
    }

    fn get_state(&self) -> ModuleState {
        // Expose count as channel 0
        let mut channels = Vec::new();
        channels.push(ChannelState {
            channel: 0,
            value: ChannelValue::Number(self.count as f64),
            raw_value: (self.count & 0xFFFF) as u16, // Only show lower 16 bits in raw?
            fault: None,
            status: self.status,
            override_active: false,
        });
        
        ModuleState {
            id: self.config.id.clone(),
            module_number: self.config.module_number.clone(),
            slot_position: self.config.slot_position,
            channels,
            last_update: current_time_ms(),
        }
    }

    fn set_channel_value(&mut self, channel: u16, value: f64) {
        if channel == 0 {
            self.count = value as u32;
        }
    }

    fn get_input_image_size(&self) -> usize {
        // 1 Word (Status) + 2 Words (Count) = 6 Bytes
        // Per channel? Assume 1 logical counter per module instance for MVP mapping
        6
    }

    fn get_output_image_size(&self) -> usize {
        // 1 Word (Control) + 2 Words (Preset) = 6 Bytes
        6
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(6);
        // Word 0: [Status, Padding] -> Little Endian [Status, 0]
        bytes.push(self.status);
        bytes.push(0);
        
        // Word 1: Count LSW (Low, High)
        let count_lsw = (self.count & 0xFFFF) as u16;
        bytes.push((count_lsw & 0xFF) as u8);
        bytes.push((count_lsw >> 8) as u8);
        
        // Word 2: Count MSW (Low, High)
        let count_msw = ((self.count >> 16) & 0xFFFF) as u16;
        bytes.push((count_msw & 0xFF) as u8);
        bytes.push((count_msw >> 8) as u8);
        
        bytes
    }

    fn write_outputs(&mut self, data: &[u8]) {
        if data.len() < 6 { return; }
        // Word 0: Control
        self.control = data[0]; // Byte 0 is control
        // Byte 1 is padding
        
        // Word 1: Preset LSW
        let preset_lsw = (data[2] as u32) | ((data[3] as u32) << 8);
        // Word 2: Preset MSW
        let preset_msw = (data[4] as u32) | ((data[5] as u32) << 8);
        
        self.preset = preset_lsw | (preset_msw << 16);
        
        // Simple logic: if control bit set, load preset?
        // TODO: Implement actual counter control logic if needed
    }
}

pub fn create_module(config: ModuleInstance) -> Option<Box<dyn Module>> {
    match config.module_number.as_str() {
        "750-1405" => Some(Box::new(DigitalInputModule::new(config, 16))),
        "750-1415" => Some(Box::new(DigitalInputModule::new(config, 8))),
        "750-430"  => Some(Box::new(DigitalInputModule::new(config, 8))),
        "753-440"  => Some(Box::new(DigitalInputModule::new(config, 4))),
        
        "750-1504" => Some(Box::new(DigitalOutputModule::new(config, 16))),
        "750-1515" => Some(Box::new(DigitalOutputModule::new(config, 8))),
        "750-530"  => Some(Box::new(DigitalOutputModule::new(config, 8))),
        "750-515"  => Some(Box::new(DigitalOutputModule::new(config, 4))), // Relay
        
        "750-455" => Some(Box::new(AnalogInputModule::new(config, 4))),
        "750-454" => Some(Box::new(AnalogInputModule::new(config, 2))),
        
        "750-461" => Some(Box::new(RTDModule::new(config, 2))),
        "750-464" => Some(Box::new(RTDModule::new(config, 4))),
        
        "750-563" => Some(Box::new(AnalogOutputModule::new(config, 2))),
        "750-555" => Some(Box::new(AnalogOutputModule::new(config, 4))),
        
        "750-404" => Some(Box::new(CounterModule::new(config, 1))),
        "750-633" => Some(Box::new(CounterModule::new(config, 1))),
        
        _ => None,
    }
}