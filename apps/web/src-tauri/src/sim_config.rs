use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::scenario::Scenario;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SimConfigRoot {
    pub version: u32,
    pub sim: SimSettings,
    pub transport: TransportConfig,
    pub process_image: ProcessImageConfig,
    pub modbus_map: ModbusMapConfig,
    pub racks: Vec<RackDefinition>,
    pub scenarios: Option<Vec<Scenario>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SimSettings {
    pub name: String,
    pub seed: Option<u64>,
    pub tick_ms: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TransportConfig {
    pub kind: String,
    pub listen: ListenConfig,
    pub unit_id: u8,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ListenConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ProcessImageConfig {
    pub layout: String,
    pub word_endian: String,
    pub align_modules_to: u8,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModbusMapConfig {
    pub inputs: ModbusArea,
    pub outputs: ModbusArea,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModbusArea {
    pub kind: String,
    pub base: u16,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RackDefinition {
    pub id: String,
    pub name: String,
    pub modules: Vec<ModuleDefinition>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModuleDefinition {
    pub id: String,
    pub model: String,
    pub name: String,
    pub channels: Vec<ChannelDefinition>,
    pub module_config: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChannelDefinition {
    pub ch: u16,
    pub signal: SignalDefinition,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SignalDefinition {
    pub name: String,
    #[serde(rename = "type")]
    pub signal_type: String,
}
