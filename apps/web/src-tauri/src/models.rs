use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CouplerConfig {
    pub module_number: String,
    pub ip_address: String,
    pub modbus_port: u16,
    pub unit_id: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleInstance {
    pub id: String,
    pub module_number: String,
    pub slot_position: u16,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RackConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub coupler: CouplerConfig,
    pub modules: Vec<ModuleInstance>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ChannelValue {
    Bool(bool),
    Number(f64),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelState {
    pub channel: u16,
    pub value: ChannelValue,
    pub raw_value: u16,
    pub fault: Option<String>,
    pub status: u8,
    #[serde(rename = "override")]
    pub override_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleState {
    pub id: String,
    pub module_number: String,
    pub slot_position: u16,
    pub channels: Vec<ChannelState>,
    pub last_update: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SimulationState {
    Stopped,
    Running,
    Paused,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModbusClientInfo {
    pub id: String,
    pub address: String,
    pub connected_at: u64,
    pub last_activity: u64,
    pub request_count: u64,
}

impl ModbusClientInfo {
    pub fn new(id: String, addr: SocketAddr, now: u64) -> Self {
        Self {
            id,
            address: addr.to_string(),
            connected_at: now,
            last_activity: now,
            request_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionState {
    pub modbus_clients: Vec<ModbusClientInfo>,
    pub last_activity: u64,
}
