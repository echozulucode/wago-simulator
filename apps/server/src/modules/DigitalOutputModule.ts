import { BaseModule } from './BaseModule.js';

export class DigitalOutputModule extends BaseModule {
  constructor(id: string, moduleNumber: string, channelCount: number = 16) {
    super(id, moduleNumber, channelCount);
  }

  protected getDefaultValue(): boolean {
    return false;
  }

  protected updateRawValue(channel: number): void {
    this.channelStates[channel].rawValue = this.channelStates[channel].value ? 1 : 0;
  }

  // For DO, readInputs returns the output state (readback)
  readInputs(): Buffer {
    const byteCount = Math.ceil(this.channelCount / 8);
    const buffer = Buffer.alloc(byteCount);

    for (let i = 0; i < this.channelCount; i++) {
      if (this.channelStates[i].value) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        buffer[byteIndex] |= 1 << bitIndex;
      }
    }

    return buffer;
  }

  readOutputs(): Buffer {
    return this.readInputs(); // Same as readback
  }

  writeOutputs(data: Buffer, offset: number = 0): void {
    // Unpack bytes into digital outputs
    for (let byteIndex = 0; byteIndex < data.length; byteIndex++) {
      const byte = data[byteIndex];
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        const channel = (offset + byteIndex) * 8 + bitIndex;
        if (channel >= this.channelCount) break;

        const value = (byte & (1 << bitIndex)) !== 0;
        if (this.channelStates[channel].value !== value) {
          this.channelStates[channel].value = value;
          this.channelStates[channel].rawValue = value ? 1 : 0;
          this.emit('change', { channel, value });
        }
      }
    }
  }
}
