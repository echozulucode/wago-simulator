import { BaseModule } from './BaseModule.js';

export class DigitalInputModule extends BaseModule {
  constructor(id: string, moduleNumber: string, channelCount: number = 16) {
    super(id, moduleNumber, channelCount);
  }

  protected getDefaultValue(): boolean {
    return false;
  }

  protected updateRawValue(channel: number): void {
    this.channelStates[channel].rawValue = this.channelStates[channel].value ? 1 : 0;
  }

  readInputs(): Buffer {
    // Pack digital inputs into bytes, LSB first (WAGO format)
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
}
