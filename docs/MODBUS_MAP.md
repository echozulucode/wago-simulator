# WAGO 750 Simulator - Modbus Address Map

This document describes the Modbus TCP register mapping used by the simulator, which mirrors the behavior of real WAGO 750-series fieldbus couplers.

## Overview

The simulator implements a standard Modbus TCP server (port 502) that maps I/O modules into the Modbus address space according to WAGO conventions:

| Modbus Area | Function Codes | Module Types |
|-------------|----------------|--------------|
| Discrete Inputs | FC02 | Digital Input modules |
| Coils | FC01, FC05, FC15 | Digital Output modules |
| Input Registers | FC04 | Analog Input, RTD, Counter (input data) |
| Holding Registers | FC03, FC06, FC16 | Analog Output, Counter (control), Config |

## Process Data Image Layout

Modules are mapped **consecutively** in slot order. The address range consumed by each module depends on its type and channel count.

### Example: test_rack.yaml Configuration

```
Slot 0: 750-1415 (8-ch Digital Input)
Slot 1: 750-1515 (8-ch Digital Output)
Slot 2: 750-455  (4-ch Analog Input 4-20mA)
Slot 3: 750-464  (4-ch RTD/Pt100 Input)
```

## Discrete Inputs (FC02) - Digital Input Modules

Digital input modules are packed as bits, LSB-first within each byte.

| Address | Bit | Module | Channel | Description |
|---------|-----|--------|---------|-------------|
| 0 | 0 | 750-1415 | DI.0 | Digital Input Channel 0 |
| 0 | 1 | 750-1415 | DI.1 | Digital Input Channel 1 |
| 0 | 2 | 750-1415 | DI.2 | Digital Input Channel 2 |
| 0 | 3 | 750-1415 | DI.3 | Digital Input Channel 3 |
| 0 | 4 | 750-1415 | DI.4 | Digital Input Channel 4 |
| 0 | 5 | 750-1415 | DI.5 | Digital Input Channel 5 |
| 0 | 6 | 750-1415 | DI.6 | Digital Input Channel 6 |
| 0 | 7 | 750-1415 | DI.7 | Digital Input Channel 7 |

**Read Example:**
```python
# Read 8 discrete inputs starting at address 0
result = client.read_discrete_inputs(address=0, count=8, slave=1)
# result.bits[0] = DI.0, result.bits[7] = DI.7
```

## Coils (FC01/05/15) - Digital Output Modules

Digital output modules are packed as bits, LSB-first.

| Address | Bit | Module | Channel | Description |
|---------|-----|--------|---------|-------------|
| 0 | 0 | 750-1515 | DO.0 | Digital Output Channel 0 |
| 0 | 1 | 750-1515 | DO.1 | Digital Output Channel 1 |
| 0 | 2 | 750-1515 | DO.2 | Digital Output Channel 2 |
| 0 | 3 | 750-1515 | DO.3 | Digital Output Channel 3 |
| 0 | 4 | 750-1515 | DO.4 | Digital Output Channel 4 |
| 0 | 5 | 750-1515 | DO.5 | Digital Output Channel 5 |
| 0 | 6 | 750-1515 | DO.6 | Digital Output Channel 6 |
| 0 | 7 | 750-1515 | DO.7 | Digital Output Channel 7 |

**Write Example:**
```python
# Turn on DO.0
client.write_coil(address=0, value=True, slave=1)

# Set all 8 outputs at once
client.write_coils(address=0, values=[True, False, True, False, True, False, True, False], slave=1)
```

## Input Registers (FC04) - Analog Input Modules

Analog input modules occupy 16-bit words (registers). Each channel typically uses 1 word.

### Standard I/O Area (Address 0x0000+)

| Address | Module | Channel | Data Format |
|---------|--------|---------|-------------|
| 0 | 750-455 | AI.0 | 16-bit signed, 4-20mA |
| 1 | 750-455 | AI.1 | 16-bit signed, 4-20mA |
| 2 | 750-455 | AI.2 | 16-bit signed, 4-20mA |
| 3 | 750-455 | AI.3 | 16-bit signed, 4-20mA |
| 4 | 750-464 | RTD.0 | 16-bit, temperature |
| 5 | 750-464 | RTD.1 | 16-bit, temperature |
| 6 | 750-464 | RTD.2 | 16-bit, temperature |
| 7 | 750-464 | RTD.3 | 16-bit, temperature |

### Data Conversion

**750-455 (4-20mA):**
```
Raw Value Range: 0x0000 to 0x7FFF (0 to 32767)
4mA  = 0x0000 (0)
20mA = 0x7FFF (32767)

mA = 4.0 + (raw / 32767.0) * 16.0
```

**750-464 (RTD/Pt100):**
```
Raw Value: (temperature + 200) * 10
Temperature range: -200°C to +850°C (typical Pt100)

Temperature = (raw / 10.0) - 200.0
Example: raw=2200 → (2200/10)-200 = 20.0°C
```

### Special Input Registers (Address 0x2000+)

| Address | Description | Value |
|---------|-------------|-------|
| 0x2010 | Firmware Version | e.g., 0x0100 = v1.0 |
| 0x2011 | Series | 0x0750 = 750 series |
| 0x2012 | Coupler Type | 0x0362 = 750-362 |
| 0x2030 | Module 0 Type | Numeric part of model |
| 0x2031 | Module 1 Type | Numeric part of model |
| 0x2032 | Module 2 Type | ... |

**Read Example:**
```python
# Read 4 analog input channels
result = client.read_input_registers(address=0, count=4, slave=1)
# result.registers[0] = AI.0 raw value
```

## Holding Registers (FC03/06/16) - Outputs & Config

### Analog Output Area (Address 0x0000+)

If the rack contained analog output modules (e.g., 750-563), they would be mapped here starting at address 0.

### Watchdog Configuration (Address 0x1000)

| Address | Description | Value |
|---------|-------------|-------|
| 0x1000 | Watchdog Timeout | Timeout in milliseconds (0 = disabled) |

The watchdog monitors Modbus activity. If no valid Modbus transaction occurs within the timeout period, all digital outputs are forced to 0 (safe state).

**Example:**
```python
# Enable 5-second watchdog
client.write_register(address=0x1000, value=5000, slave=1)

# Disable watchdog
client.write_register(address=0x1000, value=0, slave=1)
```

## Counter Modules (750-404, 750-633)

Counter modules have both input and output process data:

### Input (FC04) - 3 words per counter

| Word | Description |
|------|-------------|
| 0 | Status byte (low) + padding (high) |
| 1 | Count LSW (bits 0-15) |
| 2 | Count MSW (bits 16-31) |

### Output (FC03/06/16) - 3 words per counter

| Word | Description |
|------|-------------|
| 0 | Control byte (low) + padding (high) |
| 1 | Preset LSW (bits 0-15) |
| 2 | Preset MSW (bits 16-31) |

## Module Address Calculation

To calculate the starting address for a module:

1. **Digital I/O (bits):** Sum the channel count of all preceding modules of the same type
2. **Analog I/O (words):** Sum the word count of all preceding modules of the same type

### Address Formula

```
DI_address(slot) = sum(channels of DI modules in slots 0..slot-1)
DO_address(slot) = sum(channels of DO modules in slots 0..slot-1)
AI_address(slot) = sum(words of AI modules in slots 0..slot-1)
AO_address(slot) = sum(words of AO modules in slots 0..slot-1)
```

### Words per Module Type

| Module | Channels | Input Words | Output Words |
|--------|----------|-------------|--------------|
| 750-1405 | 16 DI | 0 | 0 |
| 750-1415 | 8 DI | 0 | 0 |
| 750-1504 | 16 DO | 0 | 0 |
| 750-1515 | 8 DO | 0 | 0 |
| 750-455 | 4 AI | 4 | 0 |
| 750-454 | 2 AI | 2 | 0 |
| 750-461 | 2 RTD | 2 | 0 |
| 750-464 | 4 RTD | 4 | 0 |
| 750-563 | 2 AO | 0 | 2 |
| 750-555 | 4 AO | 0 | 4 |
| 750-404 | 1 CTR | 3 | 3 |
| 750-633 | 1 CTR | 3 | 3 |

## Quick Reference for test_rack.yaml

| Operation | Function Code | Address | Count | Description |
|-----------|--------------|---------|-------|-------------|
| Read DI | FC02 | 0 | 8 | Read all digital inputs |
| Read DO | FC01 | 0 | 8 | Read all digital outputs |
| Write DO | FC15 | 0 | 8 | Write all digital outputs |
| Read AI | FC04 | 0 | 4 | Read 4-20mA inputs |
| Read RTD | FC04 | 4 | 4 | Read RTD temperatures |
| Read Watchdog | FC03 | 0x1000 | 1 | Read watchdog config |
| Write Watchdog | FC06 | 0x1000 | value | Set watchdog timeout |
