import { Router, type Request, type Response } from 'express';
import type { RackManager } from '../rack/RackManager.js';
import type { ModbusServer } from '../modbus/ModbusServer.js';

export function createSimulationRoutes(
  rackManager: RackManager,
  modbusServer: ModbusServer
): Router {
  const router = Router();

  // Get simulation status
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        state: rackManager.getSimulationState(),
        cycleTime: 10,
        modbusRunning: modbusServer.isRunning(),
        modbusClients: modbusServer.getClients(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Start simulation
  router.post('/start', (_req: Request, res: Response) => {
    rackManager.startSimulation();
    res.json({
      success: true,
      data: { state: rackManager.getSimulationState() },
      timestamp: new Date().toISOString(),
    });
  });

  // Pause simulation
  router.post('/pause', (_req: Request, res: Response) => {
    rackManager.pauseSimulation();
    res.json({
      success: true,
      data: { state: rackManager.getSimulationState() },
      timestamp: new Date().toISOString(),
    });
  });

  // Stop simulation
  router.post('/stop', (_req: Request, res: Response) => {
    rackManager.stopSimulation();
    res.json({
      success: true,
      data: { state: rackManager.getSimulationState() },
      timestamp: new Date().toISOString(),
    });
  });

  // Reset all I/O
  router.post('/reset', (_req: Request, res: Response) => {
    rackManager.resetAllIO();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
