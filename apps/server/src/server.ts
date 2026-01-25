import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer as createHttpServer, type Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { RackManager } from './rack/RackManager.js';
import { ModbusServer } from './modbus/ModbusServer.js';
import { WSHandler } from './websocket/WSHandler.js';
import { createRackRoutes } from './routes/rack.js';
import { createModuleRoutes } from './routes/modules.js';
import { createIORoutes } from './routes/io.js';
import { createSimulationRoutes } from './routes/simulation.js';
import { createSystemRoutes } from './routes/system.js';

interface ServerConfig {
  port: number;
  modbusPort: number;
}

interface ServerInstance {
  app: Express;
  httpServer: HttpServer;
  wss: WebSocketServer;
  rackManager: RackManager;
  modbusServer: ModbusServer;
  wsHandler: WSHandler;
  close: () => Promise<void>;
}

export async function createServer(config: ServerConfig): Promise<ServerInstance> {
  const { port, modbusPort } = config;

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const httpServer = createHttpServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Create core services
  const rackManager = new RackManager();
  const modbusServer = new ModbusServer(modbusPort, rackManager);
  const wsHandler = new WSHandler(wss, rackManager);

  // Connect rack manager events to WebSocket broadcasts
  rackManager.on('moduleStateChanged', (moduleId, state) => {
    wsHandler.broadcastIOUpdate(moduleId, state.channels);
  });

  rackManager.on('simulationStateChanged', (state) => {
    wsHandler.broadcastSimulationState(state);
  });

  modbusServer.on('clientConnected', (clientId, address) => {
    wsHandler.broadcastClientConnected(clientId, address);
  });

  modbusServer.on('clientDisconnected', (clientId) => {
    wsHandler.broadcastClientDisconnected(clientId);
  });

  // Mount API routes
  app.use('/api/rack', createRackRoutes(rackManager));
  app.use('/api/modules', createModuleRoutes(rackManager));
  app.use('/api/io', createIORoutes(rackManager));
  app.use('/api/simulation', createSimulationRoutes(rackManager, modbusServer));
  app.use('/api/system', createSystemRoutes());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      modbus: modbusServer.isRunning(),
      websocket: wss.clients.size > 0 || true,
    });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      timestamp: new Date().toISOString(),
    });
  });

  // Start servers
  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => resolve());
  });

  await modbusServer.start();

  // Return server instance with close method
  return {
    app,
    httpServer,
    wss,
    rackManager,
    modbusServer,
    wsHandler,
    close: async () => {
      await modbusServer.stop();
      wss.close();
      httpServer.close();
    },
  };
}
