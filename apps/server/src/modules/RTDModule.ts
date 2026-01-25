import { BaseModule } from './BaseModule.js';

export class RTDModule extends BaseModule {
  private minTemp: number;
  private maxTemp: number;

  constructor(
    id: string,
    moduleNumber: string,
    channelCount: number = 2,
    options: {
      minTemp?: number;
      maxTemp?: number;
    } = {}
  ) {
    super(id, moduleNumber, channelCount);

    // Pt100 range
    this.minTemp = options.minTemp ?? -200;
    this.maxTemp = options.maxTemp ?? 850;

    // Initialize with room temperature
    for (const state of this.channelStates) {
      state.value = 20.0;
      this.updateRawValueForState(state);
    }
  }

  protected getDefaultValue(): number {
    return 20.0; // Room temperature
  }

  protected updateRawValue(channel: number): void {
    this.updateRawValueForState(this.channelStates[channel]);
  }

  private updateRawValueForState(state: typeof this.channelStates[0]): void {
    // WAGO Pt100 format: raw = (temp + 200) * 10
    // This gives 0.1°C resolution
    const temp = state.value as number;
    const clampedTemp = Math.max(this.minTemp, Math.min(this.maxTemp, temp));
    state.rawValue = Math.round((clampedTemp + 200) * 10);
  }

  setChannelValue(channel: number, value: number | boolean): void {
    if (typeof value !== 'number') {
      throw new Error('RTD input requires numeric value');
    }
    const clampedValue = Math.max(this.minTemp, Math.min(this.maxTemp, value));
    super.setChannelValue(channel, clampedValue);
  }

  readInputs(): Buffer {
    // WAGO format: each channel has 16-bit value + 8-bit status
    // So 3 bytes per channel
    const buffer = Buffer.alloc(this.channelCount * 3);

    for (let i = 0; i < this.channelCount; i++) {
      const offset = i * 3;
      const rawValue = this.channelStates[i].rawValue;
      const status = this.channelStates[i].status;

      buffer.writeUInt16LE(rawValue, offset);
      buffer.writeUInt8(status, offset + 2);
    }

    return buffer;
  }
}
