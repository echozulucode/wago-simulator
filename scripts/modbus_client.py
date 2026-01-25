#!/usr/bin/env python3
"""
Modbus TCP Client for WAGO 750 Simulator

This script demonstrates reading from and writing to the simulated WAGO rack
configured in test_rack.yaml:
  - Slot 0: 750-1415 (8-ch Digital Input)
  - Slot 1: 750-1515 (8-ch Digital Output)
  - Slot 2: 750-455  (4-ch Analog Input 4-20mA)
  - Slot 3: 750-464  (4-ch RTD/Pt100 Input)
  - Slot 4: 750-563  (2-ch Analog Output 4-20mA)

Requirements:
  pip install pymodbus

Usage:
  python modbus_client.py [--host HOST] [--port PORT]
  python modbus_client.py --demo      # Single demo run
  python modbus_client.py --loop      # Continuous output cycling
"""

import argparse
import math
import time
from pymodbus.client import ModbusTcpClient


# === Read Functions ===

def read_digital_inputs(client, count=8):
    """Read discrete inputs (FC02) - Digital Input modules"""
    result = client.read_discrete_inputs(address=0, count=count)
    if result.isError():
        print(f"Error reading discrete inputs: {result}")
        return None
    return result.bits[:count]


def read_coils(client, count=8):
    """Read coils (FC01) - Digital Output module state"""
    result = client.read_coils(address=0, count=count)
    if result.isError():
        print(f"Error reading coils: {result}")
        return None
    return result.bits[:count]


def read_input_registers(client, address=0, count=8):
    """Read input registers (FC04) - Analog Input modules"""
    result = client.read_input_registers(address=address, count=count)
    if result.isError():
        print(f"Error reading input registers: {result}")
        return None
    return result.registers


def read_holding_registers(client, address, count):
    """Read holding registers (FC03) - Analog Output modules + config"""
    result = client.read_holding_registers(address=address, count=count)
    if result.isError():
        print(f"Error reading holding registers: {result}")
        return None
    return result.registers


# === Write Functions ===

def write_coil(client, address, value):
    """Write single coil (FC05) - Set a digital output"""
    result = client.write_coil(address=address, value=value)
    if result.isError():
        print(f"Error writing coil: {result}")
        return False
    return True


def write_coils(client, address, values):
    """Write multiple coils (FC15) - Set multiple digital outputs"""
    result = client.write_coils(address=address, values=values)
    if result.isError():
        print(f"Error writing coils: {result}")
        return False
    return True


def write_holding_register(client, address, value):
    """Write single holding register (FC06)"""
    result = client.write_register(address=address, value=value)
    if result.isError():
        print(f"Error writing register: {result}")
        return False
    return True


def write_holding_registers(client, address, values):
    """Write multiple holding registers (FC16)"""
    result = client.write_registers(address=address, values=values)
    if result.isError():
        print(f"Error writing registers: {result}")
        return False
    return True


# === Conversion Functions ===

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


# === Display Functions ===

def print_status(client):
    """Print current I/O status"""
    print("\n" + "="*70)
    print("WAGO 750 Simulator - Current I/O Status")
    print("="*70)

    # Digital Inputs (750-1415)
    di = read_digital_inputs(client, 8)
    if di:
        print("\n[750-1415] Digital Inputs (Discrete Inputs FC02, addr 0-7):")
        for i, val in enumerate(di):
            print(f"  DI.{i}: {'ON ' if val else 'OFF'}", end="  ")
            if (i + 1) % 4 == 0:
                print()

    # Digital Outputs (750-1515)
    do = read_coils(client, 8)
    if do:
        print("\n[750-1515] Digital Outputs (Coils FC01, addr 0-7):")
        for i, val in enumerate(do):
            print(f"  DO.{i}: {'ON ' if val else 'OFF'}", end="  ")
            if (i + 1) % 4 == 0:
                print()

    # Analog Inputs (750-455)
    ai = read_input_registers(client, 0, 8)
    if ai:
        print("\n[750-455] Analog Inputs 4-20mA (Input Registers FC04, addr 0-3):")
        for i in range(4):
            ma = raw_to_4_20ma(ai[i])
            print(f"  AI.{i}: {ma:6.2f} mA  (raw: 0x{ai[i]:04X})")

        # RTD (750-464)
        print("\n[750-464] RTD/Pt100 Inputs (Input Registers FC04, addr 4-7):")
        for i in range(4):
            temp = raw_to_temperature(ai[i + 4])
            print(f"  RTD.{i}: {temp:7.1f} C  (raw: 0x{ai[i+4]:04X})")

    # Analog Outputs (750-563)
    ao = read_holding_registers(client, 0, 2)
    if ao:
        print("\n[750-563] Analog Outputs (Holding Registers FC03, addr 0-1):")
        for i in range(2):
            ma = raw_to_4_20ma(ao[i])
            pct = raw_to_percent(ao[i])
            print(f"  AO.{i}: {ma:6.2f} mA  ({pct:5.1f}%)  (raw: 0x{ao[i]:04X})")

    # Watchdog status
    wd = read_holding_registers(client, 0x1000, 1)
    if wd:
        status = "(disabled)" if wd[0] == 0 else ""
        print(f"\nWatchdog Timeout (HR 0x1000): {wd[0]} ms {status}")

    print("\n" + "="*70)


def print_compact_status(client, iteration):
    """Print compact single-line status for loop mode"""
    do = read_coils(client, 8)
    ao = read_holding_registers(client, 0, 2)

    do_str = ''.join(['1' if x else '0' for x in do]) if do else "????????"

    ao0_pct = raw_to_percent(ao[0]) if ao else 0
    ao1_pct = raw_to_percent(ao[1]) if ao else 0

    print(f"[{iteration:4d}] DO: {do_str}  |  AO.0: {ao0_pct:5.1f}%  AO.1: {ao1_pct:5.1f}%")


# === Demo Functions ===

def demo_write_outputs(client):
    """Demonstrate writing to digital outputs"""
    print("\nDemo: Writing to Digital Outputs...")

    # Turn on outputs 0, 2, 4, 6 (alternating pattern)
    pattern = [True, False, True, False, True, False, True, False]
    print(f"  Writing pattern: {['ON' if x else 'OFF' for x in pattern]}")
    write_coils(client, 0, pattern)
    time.sleep(0.5)

    # Read back
    do = read_coils(client, 8)
    print(f"  Read back:       {['ON' if x else 'OFF' for x in do]}")


def demo_analog_outputs(client):
    """Demonstrate writing to analog outputs"""
    print("\nDemo: Writing to Analog Outputs...")

    # Set AO.0 to 50% (12mA), AO.1 to 75% (16mA)
    ao0_raw = percent_to_raw(50)
    ao1_raw = percent_to_raw(75)

    print(f"  Setting AO.0 to 50% (12mA), AO.1 to 75% (16mA)...")
    write_holding_registers(client, 0, [ao0_raw, ao1_raw])
    time.sleep(0.3)

    # Read back
    ao = read_holding_registers(client, 0, 2)
    if ao:
        print(f"  Read back: AO.0={raw_to_percent(ao[0]):.1f}%, AO.1={raw_to_percent(ao[1]):.1f}%")


def demo_watchdog(client):
    """Demonstrate watchdog configuration"""
    print("\nDemo: Configuring Watchdog...")

    # Set 5 second watchdog
    print("  Setting watchdog to 5000ms...")
    write_holding_register(client, 0x1000, 5000)

    wd = read_holding_registers(client, 0x1000, 1)
    print(f"  Watchdog is now: {wd[0]} ms")

    # Disable watchdog
    print("  Disabling watchdog (set to 0)...")
    write_holding_register(client, 0x1000, 0)


def run_continuous_loop(client, interval=1.0):
    """Run continuous loop cycling outputs"""
    print("\n" + "="*70)
    print("Continuous Output Cycling Mode")
    print("="*70)
    print(f"Interval: {interval}s  |  Press Ctrl+C to stop")
    print("-"*70)

    iteration = 0

    try:
        while True:
            # === Digital Outputs: Shift pattern ===
            # Create a "knight rider" scanning pattern
            bit_position = iteration % 14  # 0-6 forward, 7-13 backward
            if bit_position < 7:
                active_bit = bit_position
            else:
                active_bit = 14 - bit_position - 1

            do_pattern = [i == active_bit for i in range(8)]
            write_coils(client, 0, do_pattern)

            # === Analog Outputs: Sine wave ===
            # AO.0: Sine wave 0-100% (period ~10 iterations)
            # AO.1: Cosine wave 0-100% (90 degrees out of phase)
            phase = (iteration * 2 * math.pi) / 10.0
            ao0_pct = 50 + 50 * math.sin(phase)
            ao1_pct = 50 + 50 * math.cos(phase)

            ao0_raw = percent_to_raw(ao0_pct)
            ao1_raw = percent_to_raw(ao1_pct)
            write_holding_registers(client, 0, [ao0_raw, ao1_raw])

            # Print status
            print_compact_status(client, iteration)

            iteration += 1
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\nStopping...")

        # Reset outputs to safe state
        print("Resetting outputs to zero...")
        write_coils(client, 0, [False] * 8)
        write_holding_registers(client, 0, [0, 0])
        print("Done.")


def main():
    parser = argparse.ArgumentParser(description='Modbus TCP Client for WAGO Simulator')
    parser.add_argument('--host', default='127.0.0.1', help='Modbus server host')
    parser.add_argument('--port', type=int, default=502, help='Modbus server port')
    parser.add_argument('--demo', action='store_true', help='Run single demo cycle')
    parser.add_argument('--loop', action='store_true', help='Run continuous output cycling')
    parser.add_argument('--interval', type=float, default=0.5, help='Loop interval in seconds')
    args = parser.parse_args()

    print(f"Connecting to {args.host}:{args.port}...")
    client = ModbusTcpClient(host=args.host, port=args.port)

    if not client.connect():
        print("Failed to connect!")
        return 1

    print("Connected!")

    try:
        if args.loop:
            # Show initial status then run loop
            print_status(client)
            run_continuous_loop(client, args.interval)
        elif args.demo:
            # Single demo run
            print_status(client)
            demo_write_outputs(client)
            demo_analog_outputs(client)
            demo_watchdog(client)
            print_status(client)
        else:
            # Just show status
            print_status(client)

    finally:
        client.close()
        print("\nDisconnected.")

    return 0


if __name__ == '__main__':
    exit(main())
