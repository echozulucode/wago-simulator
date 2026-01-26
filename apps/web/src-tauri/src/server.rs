use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio_modbus::prelude::*;
use tokio_modbus::server::Service;
use tokio_modbus::ExceptionCode;
use crate::state::Simulator;

struct ClientGuard {
    simulator: Arc<Mutex<Simulator>>,
    client_id: String,
}

impl Drop for ClientGuard {
    fn drop(&mut self) {
        if let Ok(mut sim) = self.simulator.lock() {
            sim.remove_modbus_client(&self.client_id);
        }
    }
}

#[derive(Clone)]
struct SimulatorService {
    simulator: Arc<Mutex<Simulator>>,
    client_id: String,
    _guard: Arc<ClientGuard>,
}

impl Service for SimulatorService {
    type Request = Request<'static>;
    type Response = Response;
    type Exception = ExceptionCode;
    type Future = std::future::Ready<Result<Self::Response, Self::Exception>>;

    fn call(&self, req: Self::Request) -> Self::Future {
        let mut sim = self.simulator.lock().unwrap();
        sim.touch_watchdog();
        sim.note_client_activity(&self.client_id);
        
        let res = match req {
            Request::ReadCoils(addr, cnt) => {
                let coils = sim.read_coils();
                let mut subset = Vec::new();
                if (addr as usize) < coils.len() {
                    let end = std::cmp::min(coils.len(), (addr + cnt) as usize);
                    subset.extend_from_slice(&coils[addr as usize..end]);
                }
                if subset.len() < cnt as usize {
                    subset.resize(cnt as usize, false);
                }
                Ok(Response::ReadCoils(subset))
            }
            Request::ReadDiscreteInputs(addr, cnt) => {
                let inputs = sim.read_discrete_inputs();
                let mut subset = Vec::new();
                if (addr as usize) < inputs.len() {
                    let end = std::cmp::min(inputs.len(), (addr + cnt) as usize);
                    subset.extend_from_slice(&inputs[addr as usize..end]);
                }
                if subset.len() < cnt as usize {
                    subset.resize(cnt as usize, false);
                }
                Ok(Response::ReadDiscreteInputs(subset))
            }
            Request::ReadHoldingRegisters(addr, cnt) => {
                // Use the new general read method
                let values = sim.read_holding_registers(addr, cnt);
                Ok(Response::ReadHoldingRegisters(values))
            }
            Request::ReadInputRegisters(addr, cnt) => {
                if let Some(special) = sim.read_special_input_registers(addr, cnt) {
                    Ok(Response::ReadInputRegisters(special))
                } else {
                    let registers = sim.read_input_registers();
                    let mut subset = Vec::new();
                    if (addr as usize) < registers.len() {
                        let end = std::cmp::min(registers.len(), (addr + cnt) as usize);
                        subset.extend_from_slice(&registers[addr as usize..end]);
                    }
                    if subset.len() < cnt as usize {
                        subset.resize(cnt as usize, 0);
                    }
                    Ok(Response::ReadInputRegisters(subset))
                }
            }
            Request::WriteSingleCoil(addr, val) => {
                sim.write_coils(addr, &[val]);
                Ok(Response::WriteSingleCoil(addr, val))
            }
            Request::WriteMultipleCoils(addr, vals) => {
                sim.write_coils(addr, &vals);
                Ok(Response::WriteMultipleCoils(addr, vals.len() as u16))
            }
            Request::WriteSingleRegister(addr, val) => {
                sim.write_holding_registers(addr, &[val]);
                Ok(Response::WriteSingleRegister(addr, val))
            }
            Request::WriteMultipleRegisters(addr, vals) => {
                sim.write_holding_registers(addr, &vals);
                Ok(Response::WriteMultipleRegisters(addr, vals.len() as u16))
            }
            _ => {
                Err(ExceptionCode::IllegalFunction)
            }
        };
        
        std::future::ready(res)
    }
}

pub async fn run_server(simulator: Arc<Mutex<Simulator>>, port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr).await?;
    let server = tokio_modbus::server::tcp::Server::new(listener);
    
    let on_connected = Box::new(move |stream, addr| {
        let simulator = simulator.clone();
        async move {
            let client_id = {
                let mut sim = simulator.lock().unwrap();
                sim.register_modbus_client(addr)
            };
            let guard = Arc::new(ClientGuard {
                simulator: simulator.clone(),
                client_id: client_id.clone(),
            });
            let service = SimulatorService {
                simulator,
                client_id,
                _guard: guard,
            };
            Ok(Some((service, stream)))
        }
    });

    let on_process_error = |err| {
        eprintln!("Modbus server error: {:?}", err);
    };

    server.serve(&on_connected, on_process_error).await?;
    
    Ok(())
}
