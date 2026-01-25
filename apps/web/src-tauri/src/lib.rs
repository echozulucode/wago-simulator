pub mod models;
pub mod modules;
pub mod server;
pub mod state;
pub mod sim_config;

use models::{ModuleInstance, RackConfig, SimulationState, ModuleState};
use state::{AppState, Simulator};
use std::sync::{Arc, Mutex};
use tauri::{State, Manager};

// --- Commands ---

#[tauri::command]
fn get_rack_state(state: State<AppState>) -> Result<(Option<RackConfig>, Vec<ModuleState>, SimulationState), String> {
    let sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    let module_states = sim.get_all_module_states();
    Ok((sim.config.clone(), module_states, sim.simulation_state.clone()))
}

#[tauri::command]
fn create_rack(state: State<AppState>, name: String, description: Option<String>) -> Result<RackConfig, String> {
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    
    let now = chrono::Utc::now().to_rfc3339();
    let config = RackConfig {
        id: format!("rack-{}", chrono::Utc::now().timestamp_millis()),
        name,
        description,
        coupler: models::CouplerConfig {
            module_number: "750-362".to_string(),
            ip_address: "127.0.0.1".to_string(),
            modbus_port: 502,
            unit_id: 1,
        },
        modules: vec![],
        created_at: now.clone(),
        updated_at: now,
    };
    
    sim.load_rack(config.clone());
    Ok(config)
}

#[tauri::command]
fn list_configs() -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let paths_to_check = vec![".", "../../../"]; // Check current dir and project root (from src-tauri)

    for dir in paths_to_check {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(ext) = path.extension() {
                    if ext == "yaml" || ext == "yml" {
                        files.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn load_config(state: State<AppState>, config_path: String) -> Result<RackConfig, String> {
    let content = std::fs::read_to_string(&config_path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    sim.load_from_yaml_string(&content).map_err(|e| format!("Failed to parse YAML: {}", e))?;
    
    Ok(sim.config.clone().ok_or("Failed to load config".to_string())?)
}

#[tauri::command]
fn add_module(state: State<AppState>, module_number: String, slot_position: u16) -> Result<ModuleInstance, String> {
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    
    if let Some(config) = &mut sim.config {
        let id = format!("module-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
        let instance = ModuleInstance {
            id: id.clone(),
            module_number,
            slot_position,
            label: None,
        };
        
        config.modules.push(instance.clone());
        config.modules.sort_by_key(|m| m.slot_position);
        
        let new_config = config.clone();
        sim.load_rack(new_config);
        
        Ok(instance)
    } else {
        Err("No rack configured".to_string())
    }
}

#[tauri::command]
fn remove_module(state: State<AppState>, module_id: String) -> Result<(), String> {
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    
    if let Some(config) = &mut sim.config {
        config.modules.retain(|m| m.id != module_id);
        let new_config = config.clone();
        sim.load_rack(new_config);
        Ok(())
    } else {
        Err("No rack configured".to_string())
    }
}

#[tauri::command]
fn set_channel_value(state: State<AppState>, module_id: String, channel: u16, value: f64) -> Result<(), String> {
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    sim.set_channel_value(&module_id, channel, value);
    Ok(())
}

#[tauri::command]
async fn start_simulation(state: State<'_, AppState>) -> Result<(), String> {
    let simulator = state.inner().0.clone();
    
    {
        let mut sim = simulator.lock().map_err(|e| e.to_string())?;
        if sim.simulation_state == SimulationState::Running {
            return Ok(());
        }
        sim.simulation_state = SimulationState::Running;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(e) = server::run_server(simulator, 502).await {
            eprintln!("Modbus server error: {}", e);
        }
    });
    
    Ok(())
}

#[tauri::command]
fn stop_simulation(state: State<AppState>) -> Result<(), String> {
    let mut sim = state.inner().0.lock().map_err(|e| e.to_string())?;
    sim.simulation_state = SimulationState::Stopped;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(AppState(Arc::new(Mutex::new(Simulator::new()))))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_state = app.state::<AppState>();
      let sim = app_state.0.clone();
      tauri::async_runtime::spawn(async move {
          loop {
              tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
              if let Ok(mut s) = sim.lock() {
                  s.check_watchdog();
              }
          }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_rack_state,
        create_rack,
        list_configs,
        load_config,
        add_module,
        remove_module,
        set_channel_value,
        start_simulation,
        stop_simulation
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
