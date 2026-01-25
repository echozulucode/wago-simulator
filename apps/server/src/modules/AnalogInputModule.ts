import { BaseModule } from './BaseModule.js';

export class AnalogInputModule extends BaseModule {
  private minValue: number;
  private maxValue: number;
  private rawMin: number;
  private rawMax: number;

  constructor(
    id: string,
    moduleNumber: string,
    channelCount: number = 4,
    options: {
      minValue?: number;
      maxValue?: number;
      rawMin?: number;
      rawMax?: number;
    } = {}
  ) {
    super(id, moduleNumber, channelCount);

    // Default to 4-20mA range
    this.minValue = options.minValue ?? 4;
    this.maxValue = options.maxValue ?? 20;
    this.rawMin = options.rawMin ?? 0x0000;
    this.rawMax = options.rawMax ?? 0x7fff;

    // Initialize with 4mA (zero scale)
    for (const state of this.channelStates) {
      state.value = this.minValue;
      this.updateRawValueForState(state);
    }
  }

  protected getDefaultValue(): number {
    return this.minValue;
  }

  protected updateRawValue(channel: number): void {
    this.updateRawValueForState(this.channelStates[channel]);
  }

  private updateRawValueForState(state: typeof this.channelStates[0]): void {
    const value = state.value as number;
    // Clamp value to valid range
    const clampedValue = Math.max(0, Math.min(this.maxValue + 4, value));
    // Map to raw value
    const normalized = (clampedValue - this.minValue) / (this.maxValue - this.minValue);
    state.rawValue = Math.round(this.rawMin + normalized * (this.rawMax - this.rawMin));
    // Clamp raw value
    state.rawValue = Math.max(0, Math.min(0xffff, state.rawValue));
  }

  setChannelValue(channel: number, value: number | boolean): void {
    if (typeof value !== 'number') {
      throw new Error('Analog input requires numeric value');
    }
    // Clamp to extended range (0-24mA for 4-20mA)
    const clampedValue = Math.max(0, Math.min(this.maxValue + 4, value));
    super.setChannelValue(channel, clampedValue);
  }

  readInputs(): Buffer {
    // Each channel is 16-bit, little-endian
    const buffer = Buffer.alloc(this.channelCount * 2);

    for (let i = 0; i < this.channelCount; i++) {
      const rawValue = this.channelStates[i].rawValue;
      buffer.writeUInt16LE(rawValue, i * 2);
    }

    return buffer;
  }
}
