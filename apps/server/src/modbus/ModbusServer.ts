import { EventEmitter } from 'events';
import ModbusRTU from 'modbus-serial';
import type { RackManager } from '../rack/RackManager.js';

interface ModbusClient {
  id: string;
  address: string;
  connectedAt: number;
}

export class ModbusServer extends EventEmitter {
  private port: number;
  private rackManager: RackManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private server: any = null;
  private clients: Map<string, ModbusClient> = new Map();
  private running: boolean = false;

  // Process image buffers
  private coils: boolean[] = new Array(512).fill(false);
  private discreteInputs: boolean[] = new Array(512).fill(false);
  private holdingRegisters: number[] = new Array(256).fill(0);
  private inputRegisters: number[] = new Array(256).fill(0);

  constructor(port: number, rackManager: RackManager) {
    super();
    this.port = port;
    this.rackManager = rackManager;
  }

  async start(): Promise<void> {
    if (this.running) return;

    return new Promise((resolve, reject) => {
      try {
        // Create the Modbus TCP server using the vector API
        const vector = {
          getCoil: this.handleReadCoil.bind(this),
          getDiscreteInput: this.handleReadDiscreteInput.bind(this),
          getHoldingRegister: this.handleReadHoldingRegister.bind(this),
          getInputRegister: this.handleReadInputRegister.bind(this),
          setCoil: this.handleWriteCoil.bind(this),
          setRegister: this.handleWriteRegister.bind(this),
        };

        // ModbusRTU.ServerTCP constructor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ServerTCP = (ModbusRTU as any).ServerTCP;
        this.server = new ServerTCP(vector, {
          host: '0.0.0.0',
          port: this.port,
          debug: false,
          unitID: 1,
        });

        this.running = true;
        console.log(`Modbus TCP server started on port ${this.port}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.running || !this.server) return;

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.running = false;
        this.clients.clear();
        console.log('Modbus TCP server stopped');
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  getClients(): ModbusClient[] {
    return Array.from(this.clients.values());
  }

  // Update process image from rack manager
  updateProcessImage(): void {
    const { inputs } = this.rackManager.getProcessImage();

    // Update discrete inputs from digital input modules
    let bitIndex = 0;
    for (const byte of inputs) {
      for (let i = 0; i < 8 && bitIndex < this.discreteInputs.length; i++) {
        this.discreteInputs[bitIndex++] = (byte & (1 << i)) !== 0;
      }
    }

    // Update input registers from analog/RTD modules
    // (This is a simplified approach - real implementation would map per module)
    for (let i = 0; i < inputs.length / 2 && i < this.inputRegisters.length; i++) {
      this.inputRegisters[i] = inputs.readUInt16LE(i * 2);
    }
  }

  // Modbus handler functions
  private handleReadCoil(
    addr: number,
    _unitID: number,
    callback: (err: Error | null, value?: boolean) => void
  ): void {
    if (addr >= 0 && addr < this.coils.length) {
      callback(null, this.coils[addr]);
    } else {
      callback(new Error('Invalid address'));
    }
  }

  private handleReadDiscreteInput(
    addr: number,
    _unitID: number,
    callback: (err: Error | null, value?: boolean) => void
  ): void {
    // Refresh from rack manager
    this.updateProcessImage();

    if (addr >= 0 && addr < this.discreteInputs.length) {
      callback(null, this.discreteInputs[addr]);
    } else {
      callback(new Error('Invalid address'));
    }
  }

  private handleReadHoldingRegister(
    addr: number,
    _unitID: number,
    callback: (err: Error | null, value?: number) => void
  ): void {
    if (addr >= 0 && addr < this.holdingRegisters.length) {
      callback(null, this.holdingRegisters[addr]);
    } else {
      callback(new Error('Invalid address'));
    }
  }

  private handleReadInputRegister(
    addr: number,
    _unitID: number,
    callback: (err: Error | null, value?: number) => void
  ): void {
    // Refresh from rack manager
    this.updateProcessImage();

    if (addr >= 0 && addr < this.inputRegisters.length) {
      callback(null, this.inputRegisters[addr]);
    } else {
      callback(new Error('Invalid address'));
    }
  }

  private handleWriteCoil(
    addr: number,
    value: boolean,
    _unitID: number,
    callback: (err: Error | null) => void
  ): void {
    if (addr >= 0 && addr < this.coils.length) {
      this.coils[addr] = value;

      // Write to rack manager
      const byteIndex = Math.floor(addr / 8);
      const bitIndex = addr % 8;
      const data = Buffer.alloc(1);
      if (value) {
        data[0] |= 1 << bitIndex;
      }
      this.rackManager.writeOutputs(byteIndex, data);

      callback(null);
    } else {
      callback(new Error('Invalid address'));
    }
  }

  private handleWriteRegister(
    addr: number,
    value: number,
    _unitID: number,
    callback: (err: Error | null) => void
  ): void {
    if (addr >= 0 && addr < this.holdingRegisters.length) {
      this.holdingRegisters[addr] = value;
      callback(null);
    } else {
      callback(new Error('Invalid address'));
    }
  }
}
