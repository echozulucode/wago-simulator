import { WebSocketServer, type WebSocket } from 'ws';
import type { RackManager } from '../rack/RackManager.js';
import type { ChannelState, SimulationState, WSMessage, WSMessageType } from '@wago/shared';

export class WSHandler {
  private wss: WebSocketServer;
  private rackManager: RackManager;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(wss: WebSocketServer, rackManager: RackManager) {
    this.wss = wss;
    this.rackManager = rackManager;

    this.setupConnectionHandlers();
    this.startHeartbeat();
  }

  private setupConnectionHandlers(): void {
    this.wss.on('connection', (ws, req) => {
      const clientAddress = req.socket.remoteAddress ?? 'unknown';
      console.log(`WebSocket client connected: ${clientAddress}`);

      // Send initial state
      this.sendInitialState(ws);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientAddress}`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private sendInitialState(ws: WebSocket): void {
    // Send current rack state
    const config = this.rackManager.getConfig();
    if (config) {
      this.send(ws, 'io-update', {
        modules: this.rackManager.getAllModuleStates(),
      });
    }

    // Send simulation state
    this.send(ws, 'simulation-state', {
      state: this.rackManager.getSimulationState(),
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'heartbeat':
        this.send(ws, 'heartbeat', { timestamp: Date.now() });
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('heartbeat', { timestamp: Date.now() });
    }, 5000);
  }

  private send(ws: WebSocket, type: WSMessageType, payload: unknown): void {
    if (ws.readyState === ws.OPEN) {
      const message: WSMessage = {
        type,
        timestamp: Date.now(),
        payload,
      };
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(type: WSMessageType, payload: unknown): void {
    const message: WSMessage = {
      type,
      timestamp: Date.now(),
      payload,
    };
    const data = JSON.stringify(message);

    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    });
  }

  // Public broadcast methods
  broadcastIOUpdate(moduleId: string, channels: ChannelState[]): void {
    this.broadcast('io-update', { moduleId, channels });
  }

  broadcastSimulationState(state: SimulationState): void {
    this.broadcast('simulation-state', { state });
  }

  broadcastClientConnected(clientId: string, address: string): void {
    this.broadcast('client-connected', { clientId, address });
  }

  broadcastClientDisconnected(clientId: string): void {
    this.broadcast('client-disconnected', { clientId });
  }

  broadcastError(error: string): void {
    this.broadcast('error', { error });
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
