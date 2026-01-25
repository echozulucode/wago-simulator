#!/usr/bin/env python3
"""
Modbus TCP Client for WAGO 750 Simulator

Uses the standard WAGO process image layout where all I/O is accessed via registers:
- Input Image (FC04): Analog inputs first, then digital inputs packed as words
- Output Image (FC03/16): Analog outputs first, then digital outputs packed as words

This enables single-read/single-write per cycle for efficiency.

Test rack layout (test_rack.yaml):
  - Slot 0: 750-1415 (8-ch Digital Input)   -> Input Registers (after AI)
  - Slot 1: 750-1515 (8-ch Digital Output)  -> Holding Registers (after AO)
  - Slot 2: 750-455  (4-ch Analog Input)    -> Input Registers 0-3
  - Slot 3: 750-464  (4-ch RTD Input)       -> Input Registers 4-7
  - Slot 4: 750-563  (2-ch Analog Output)   -> Holding Registers 0-1

Output Process Image (Holding Registers):
  HR 0: AO Channel 0 (750-563)
  HR 1: AO Channel 1 (750-563)
  HR 2: DO bits 0-7 packed (750-1515) [low byte = DO bits, high byte = 0]

Requirements:
  pip install pymodbus

Usage:
  python modbus_client.py                   # Show status
  python modbus_client.py --demo            # Single demo run
  python modbus_client.py --loop            # Continuous output cycling
  python modbus_client.py --loop --interval 0.2
"""

import argparse
import math
import time
from pymodbus.client import ModbusTcpClient


# =============================================================================
# Process Image Addresses (based on test_rack.yaml)
# =============================================================================

# Input Registers (FC04) - Read
IR_AI_BASE = 0      # 750-455: 4 words (channels 0-3)
IR_RTD_BASE = 4     # 750-464: 4 words (channels 0-3)
IR_DI_BASE = 8      # 750-1415: 1 word (8 bits packed)
IR_TOTAL_WORDS = 9  # Total input registers to read

# Holding Registers (FC03/16) - Read/Write
HR_AO_BASE = 0      # 750-563: 2 words (channels 0-1)
HR_DO_BASE = 2      # 750-1515: 1 word (8 bits packed in low byte)
HR_TOTAL_WORDS = 3  # Total holding registers for process image

# Special Registers
HR_WATCHDOG = 0x1000


# =============================================================================
# Conversion Functions
# =============================================================================

def raw_to_4_20ma(raw_value):
    """Convert raw 16-bit value to 4-20mA"""
    normalized = raw_value / 32767.0
    return 4.0 + (normalized * 16.0)


def ma_to_raw(ma_value):
    """Convert 4-20mA to raw 16-bit value"""
    if ma_value < 4.0:
        return 0
    normalized = (ma_value - 4.0) / 16.0
    return int(normalized * 32767)


def raw_to_temperature(raw_value):
    """Convert raw 16-bit value to temperature (Pt100)"""
    return (raw_value / 10.0) - 200.0


def raw_to_percent(raw_value):
    """Convert raw 16-bit value to percent (0-100%)"""
    return (raw_value / 32767.0) * 100.0


def percent_to_raw(percent):
    """Convert percent (0-100%) to raw 16-bit value"""
    return int((percent / 100.0) * 32767)


def bits_to_word(bits):
    """Pack 8 boolean bits into a 16-bit word (bits in low byte)"""
    word = 0
    for i, bit in enumerate(bits[:8]):
        if bit:
            word |= (1 << i)
    return word


def word_to_bits(word, count=8):
    """Unpack a 16-bit word into boolean bits (from low byte)"""
    return [(word & (1 << i)) != 0 for i in range(count)]


# =============================================================================
# Process Image I/O (Single Read/Write)
# =============================================================================

def read_process_inputs(client):
    """
    Read entire input process image in one transaction (FC04).
    Returns dict with parsed values or None on error.
    """
    result = client.read_input_registers(address=0, count=IR_TOTAL_WORDS)
    if result.isError():
        print(f"Error reading input registers: {result}")
        return None

    regs = result.registers
    return {
        'ai': regs[IR_AI_BASE:IR_AI_BASE + 4],      # 4 analog input words
        'rtd': regs[IR_RTD_BASE:IR_RTD_BASE + 4],   # 4 RTD words
        'di': word_to_bits(regs[IR_DI_BASE], 8),    # 8 digital input bits
    }


def read_process_outputs(client):
    """
    Read entire output process image in one transaction (FC03).
    Returns dict with parsed values or None on error.
    """
    result = client.read_holding_registers(address=0, count=HR_TOTAL_WORDS)
    if result.isError():
        print(f"Error reading holding registers: {result}")
        return None

    regs = result.registers
    return {
        'ao': regs[HR_AO_BASE:HR_AO_BASE + 2],      # 2 analog output words
        'do': word_to_bits(regs[HR_DO_BASE], 8),    # 8 digital output bits
    }


def write_process_outputs(client, ao_values, do_bits):
    """
    Write entire output process image in one transaction (FC16).

    Args:
        ao_values: List of 2 raw 16-bit values for analog outputs
        do_bits: List of 8 booleans for digital outputs
    """
    # Build the output register array
    output_regs = [
        ao_values[0],           # HR 0: AO.0
        ao_values[1],           # HR 1: AO.1
        bits_to_word(do_bits),  # HR 2: DO bits packed
    ]

    result = client.write_registers(address=0, values=output_regs)
    if result.isError():
        print(f"Error writing holding registers: {result}")
        return False
    return True


# =============================================================================
# Display Functions
# =============================================================================

def print_status(client):
    """Print current I/O status"""
    print("\n" + "=" * 70)
    print("WAGO 750 Simulator - Process Image Status")
    print("=" * 70)

    # Read all inputs in one call
    inputs = read_process_inputs(client)
    if inputs:
        # Digital Inputs (750-1415)
        print("\n[750-1415] Digital Inputs (IR addr 8, bits 0-7):")
        for i, val in enumerate(inputs['di']):
            print(f"  DI.{i}: {'ON ' if val else 'OFF'}", end="  ")
            if (i + 1) % 4 == 0:
                print()

        # Analog Inputs (750-455)
        print("\n[750-455] Analog Inputs 4-20mA (IR addr 0-3):")
        for i, raw in enumerate(inputs['ai']):
            ma = raw_to_4_20ma(raw)
            print(f"  AI.{i}: {ma:6.2f} mA  (raw: 0x{raw:04X})")

        # RTD (750-464)
        print("\n[750-464] RTD/Pt100 Inputs (IR addr 4-7):")
        for i, raw in enumerate(inputs['rtd']):
            temp = raw_to_temperature(raw)
            print(f"  RTD.{i}: {temp:7.1f} C  (raw: 0x{raw:04X})")

    # Read all outputs in one call
    outputs = read_process_outputs(client)
    if outputs:
        # Digital Outputs (750-1515)
        print("\n[750-1515] Digital Outputs (HR addr 2, bits 0-7):")
        for i, val in enumerate(outputs['do']):
            print(f"  DO.{i}: {'ON ' if val else 'OFF'}", end="  ")
            if (i + 1) % 4 == 0:
                print()

        # Analog Outputs (750-563)
        print("\n[750-563] Analog Outputs (HR addr 0-1):")
        for i, raw in enumerate(outputs['ao']):
            ma = raw_to_4_20ma(raw)
            pct = raw_to_percent(raw)
            print(f"  AO.{i}: {ma:6.2f} mA  ({pct:5.1f}%)  (raw: 0x{raw:04X})")

    # Watchdog status
    wd_result = client.read_holding_registers(address=HR_WATCHDOG, count=1)
    if not wd_result.isError():
        wd = wd_result.registers[0]
        status = "(disabled)" if wd == 0 else ""
        print(f"\nWatchdog Timeout (HR 0x1000): {wd} ms {status}")

    print("\n" + "=" * 70)


def print_compact_status(client, iteration):
    """Print compact single-line status for loop mode"""
    outputs = read_process_outputs(client)
    if not outputs:
        return

    do_str = ''.join(['1' if x else '0' for x in outputs['do']])
    ao0_pct = raw_to_percent(outputs['ao'][0])
    ao1_pct = raw_to_percent(outputs['ao'][1])

    print(f"[{iteration:4d}] DO: {do_str}  |  AO.0: {ao0_pct:5.1f}%  AO.1: {ao1_pct:5.1f}%")


# =============================================================================
# Demo Functions
# =============================================================================

def demo_write_outputs(client):
    """Demonstrate writing to digital outputs via registers"""
    print("\nDemo: Writing Digital Outputs via Holding Register...")

    # Turn on outputs 0, 2, 4, 6 (alternating pattern)
    do_pattern = [True, False, True, False, True, False, True, False]
    print(f"  DO pattern: {['ON' if x else 'OFF' for x in do_pattern]}")

    # Write all outputs at once (keep AO at current values)
    outputs = read_process_outputs(client)
    ao_values = outputs['ao'] if outputs else [0, 0]

    write_process_outputs(client, ao_values, do_pattern)
    time.sleep(0.3)

    # Read back
    outputs = read_process_outputs(client)
    if outputs:
        print(f"  Read back:  {['ON' if x else 'OFF' for x in outputs['do']]}")


def demo_analog_outputs(client):
    """Demonstrate writing to analog outputs"""
    print("\nDemo: Writing Analog Outputs...")

    # Set AO.0 to 50% (12mA), AO.1 to 75% (16mA)
    ao0_raw = percent_to_raw(50)
    ao1_raw = percent_to_raw(75)
    print(f"  Setting AO.0 to 50% (12mA), AO.1 to 75% (16mA)...")

    # Write all outputs at once (keep DO at current values)
    outputs = read_process_outputs(client)
    do_bits = outputs['do'] if outputs else [False] * 8

    write_process_outputs(client, [ao0_raw, ao1_raw], do_bits)
    time.sleep(0.3)

    # Read back
    outputs = read_process_outputs(client)
    if outputs:
        print(f"  Read back: AO.0={raw_to_percent(outputs['ao'][0]):.1f}%, "
              f"AO.1={raw_to_percent(outputs['ao'][1]):.1f}%")


def demo_watchdog(client):
    """Demonstrate watchdog configuration"""
    print("\nDemo: Configuring Watchdog...")

    # Set 5 second watchdog
    print("  Setting watchdog to 5000ms...")
    client.write_register(address=HR_WATCHDOG, value=5000)

    wd_result = client.read_holding_registers(address=HR_WATCHDOG, count=1)
    print(f"  Watchdog is now: {wd_result.registers[0]} ms")

    # Disable watchdog
    print("  Disabling watchdog (set to 0)...")
    client.write_register(address=HR_WATCHDOG, value=0)


# =============================================================================
# Continuous Loop Mode
# =============================================================================

def run_continuous_loop(client, interval=0.5):
    """
    Run continuous loop cycling outputs using single write per cycle.

    This demonstrates the typical PLC scan cycle pattern:
    1. Read all inputs (one FC04 call)
    2. Process logic
    3. Write all outputs (one FC16 call)
    """
    print("\n" + "=" * 70)
    print("Continuous Output Cycling Mode (Single-Write-Per-Cycle)")
    print("=" * 70)
    print(f"Interval: {interval}s  |  Press Ctrl+C to stop")
    print("-" * 70)

    iteration = 0

    try:
        while True:
            # === Calculate new output values ===

            # Digital Outputs: Knight rider scanning pattern (0-7-0)
            bit_position = iteration % 14
            if bit_position < 8:
                active_bit = bit_position  # 0,1,2,3,4,5,6,7
            else:
                active_bit = 14 - bit_position  # 6,5,4,3,2,1

            do_bits = [i == active_bit for i in range(8)]

            # Analog Outputs: Sine/cosine waves
            phase = (iteration * 2 * math.pi) / 10.0
            ao0_pct = 50 + 50 * math.sin(phase)
            ao1_pct = 50 + 50 * math.cos(phase)
            ao_values = [percent_to_raw(ao0_pct), percent_to_raw(ao1_pct)]

            # === Write all outputs in ONE transaction ===
            write_process_outputs(client, ao_values, do_bits)

            # Print status
            print_compact_status(client, iteration)

            iteration += 1
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\nStopping...")

        # Reset outputs to safe state
        print("Resetting all outputs to zero...")
        write_process_outputs(client, [0, 0], [False] * 8)
        print("Done.")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Modbus TCP Client for WAGO Simulator (Register-Based I/O)')
    parser.add_argument('--host', default='127.0.0.1', help='Modbus server host')
    parser.add_argument('--port', type=int, default=502, help='Modbus server port')
    parser.add_argument('--demo', action='store_true', help='Run single demo cycle')
    parser.add_argument('--loop', action='store_true', help='Run continuous output cycling')
    parser.add_argument('--interval', type=float, default=0.5,
                        help='Loop interval in seconds (default: 0.5)')
    args = parser.parse_args()

    print(f"Connecting to {args.host}:{args.port}...")
    client = ModbusTcpClient(host=args.host, port=args.port)

    if not client.connect():
        print("Failed to connect!")
        return 1

    print("Connected!")

    try:
        if args.loop:
            print_status(client)
            run_continuous_loop(client, args.interval)
        elif args.demo:
            print_status(client)
            demo_write_outputs(client)
            demo_analog_outputs(client)
            demo_watchdog(client)
            print_status(client)
        else:
            print_status(client)

    finally:
        client.close()
        print("\nDisconnected.")

    return 0


if __name__ == '__main__':
    exit(main())
