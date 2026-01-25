use crate::models::{ChannelState, ModuleInstance, ModuleState, ChannelValue};
use std::time::{SystemTime, UNIX_EPOCH};

pub trait Module: Send + Sync {
    fn get_id(&self) -> &str;
    fn get_config(&self) -> &ModuleInstance;
    fn get_state(&self) -> ModuleState;

    fn set_channel_value(&mut self, channel: u16, value: f64);

    // Process Image
    fn get_input_image_size(&self) -> usize; // in bytes
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

// --- Digital Input Module (750-1405) ---
pub struct DigitalInputModule {
    config: ModuleInstance,
    channels: Vec<bool>,
}

impl DigitalInputModule {
    pub fn new(config: ModuleInstance) -> Self {
        Self {
            config,
            channels: vec![false; 16],
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
        2 // 16 bits = 2 bytes
    }

    fn get_output_image_size(&self) -> usize {
        0
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = vec![0u8; 2];
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

// --- Digital Output Module (750-1504) ---
pub struct DigitalOutputModule {
    config: ModuleInstance,
    channels: Vec<bool>,
}

impl DigitalOutputModule {
    pub fn new(config: ModuleInstance) -> Self {
        Self {
            config,
            channels: vec![false; 16],
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
        2 // 16 bits = 2 bytes
    }

    fn read_inputs(&self) -> Vec<u8> {
        vec![]
    }

    fn write_outputs(&mut self, data: &[u8]) {
        if data.len() < 2 { return; }
        for i in 0..16 {
            let byte_idx = i / 8;
            let bit_idx = i % 8;
            if byte_idx < data.len() {
                self.channels[i] = (data[byte_idx] & (1 << bit_idx)) != 0;
            }
        }
    }
}

// --- Analog Input Module (750-455) ---
pub struct AnalogInputModule {
    config: ModuleInstance,
    values: Vec<f64>, // mA
}

impl AnalogInputModule {
    pub fn new(config: ModuleInstance) -> Self {
        Self {
            config,
            values: vec![4.0; 4],
        }
    }

    fn current_to_raw(&self, ma: f64) -> u16 {
        if ma < 4.0 { return 0; }
        let normalized = (ma - 4.0) / 16.0;
        let val = (normalized * 32767.0) as i32;
        val.clamp(0, 32767) as u16
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
                raw_value: self.current_to_raw(val),
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
        8 // 4 channels * 2 bytes
    }

    fn get_output_image_size(&self) -> usize {
        0
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(8);
        for &val in &self.values {
            let raw = self.current_to_raw(val);
            bytes.push((raw & 0xFF) as u8);
            bytes.push((raw >> 8) as u8);
        }
        bytes
    }

    fn write_outputs(&mut self, _data: &[u8]) {
    }
}

// --- RTD Input Module (750-461) ---
pub struct RTDModule {
    config: ModuleInstance,
    temperatures: Vec<f64>,
}

impl RTDModule {
    pub fn new(config: ModuleInstance) -> Self {
        Self {
            config,
            temperatures: vec![20.0; 2],
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
        6
    }

    fn get_output_image_size(&self) -> usize {
        2
    }

    fn read_inputs(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(6);
        for &val in &self.temperatures {
            let raw = self.temp_to_raw(val);
            bytes.push((raw & 0xFF) as u8);
            bytes.push((raw >> 8) as u8);
            bytes.push(0); 
        }
        bytes
    }

    fn write_outputs(&mut self, _data: &[u8]) {
    }
}

pub fn create_module(config: ModuleInstance) -> Option<Box<dyn Module>> {
    match config.module_number.as_str() {
        "750-1405" => Some(Box::new(DigitalInputModule::new(config))),
        "750-1504" => Some(Box::new(DigitalOutputModule::new(config))),
        "750-455" => Some(Box::new(AnalogInputModule::new(config))),
        "750-461" => Some(Box::new(RTDModule::new(config))),
        _ => None,
    }
}