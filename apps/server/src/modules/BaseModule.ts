import { EventEmitter } from 'events';
import type { ChannelState, FaultType } from '@wago/shared';

export abstract class BaseModule extends EventEmitter {
  readonly id: string;
  readonly moduleNumber: string;
  protected channelCount: number;
  protected channelStates: ChannelState[];

  constructor(id: string, moduleNumber: string, channelCount: number) {
    super();
    this.id = id;
    this.moduleNumber = moduleNumber;
    this.channelCount = channelCount;
    this.channelStates = this.createInitialChannelStates();
  }

  protected createInitialChannelStates(): ChannelState[] {
    return Array.from({ length: this.channelCount }, (_, i) => ({
      channel: i,
      value: this.getDefaultValue(),
      rawValue: 0,
      fault: null,
      status: 0,
      override: false,
    }));
  }

  protected abstract getDefaultValue(): number | boolean;

  // Read process image data (inputs from this module)
  abstract readInputs(): Buffer;

  // Read output readback (for DO modules)
  readOutputs(): Buffer {
    return Buffer.alloc(0);
  }

  // Write outputs (for DO modules)
  writeOutputs(_data: Buffer, _offset?: number): void {
    // Override in output modules
  }

  // Get/set channel values
  getChannelValue(channel: number): number | boolean {
    if (channel < 0 || channel >= this.channelCount) {
      throw new Error(`Channel ${channel} out of range`);
    }
    return this.channelStates[channel].value;
  }

  setChannelValue(channel: number, value: number | boolean): void {
    if (channel < 0 || channel >= this.channelCount) {
      throw new Error(`Channel ${channel} out of range`);
    }
    this.channelStates[channel].value = value;
    this.channelStates[channel].override = true;
    this.updateRawValue(channel);
    this.emit('change', { channel, value });
  }

  protected abstract updateRawValue(channel: number): void;

  // Fault simulation
  setFault(channel: number, fault: FaultType): void {
    if (channel < 0 || channel >= this.channelCount) {
      throw new Error(`Channel ${channel} out of range`);
    }
    this.channelStates[channel].fault = fault;
    this.updateStatus(channel);
    this.emit('fault', { channel, fault });
  }

  clearFault(channel: number): void {
    if (channel < 0 || channel >= this.channelCount) {
      throw new Error(`Channel ${channel} out of range`);
    }
    this.channelStates[channel].fault = null;
    this.updateStatus(channel);
    this.emit('faultCleared', { channel });
  }

  protected updateStatus(channel: number): void {
    const fault = this.channelStates[channel].fault;
    let status = 0;

    if (fault) {
      switch (fault) {
        case 'open-circuit':
          status = 0x01;
          break;
        case 'short-circuit':
          status = 0x02;
          break;
        case 'over-range':
          status = 0x04;
          break;
        case 'under-range':
          status = 0x08;
          break;
        case 'sensor-break':
          status = 0x10;
          break;
      }
    }

    this.channelStates[channel].status = status;
  }

  // Reset all channels to default
  reset(): void {
    this.channelStates = this.createInitialChannelStates();
    this.emit('reset');
  }

  // Get all channel states
  getChannelStates(): ChannelState[] {
    return [...this.channelStates];
  }
}
