# WAGO Discovery Interface - Quick Reference

## Register Map

| Address     | Type    | Description                   | Example Value    |
| ----------- | ------- | ----------------------------- | ---------------- |
| **0x1000**  | Holding | Watchdog timeout (ms)         | 1000             |
| **0x1003**  | Holding | Watchdog trigger (write-only) | 0                |
| **0x1009**  | Holding | Socket close on watchdog      | 0/1              |
| **0x1022**  | Input   | Output analog bits            | 0                |
| **0x1023**  | Input   | Input analog bits             | 128              |
| **0x1024**  | Input   | Output digital bits           | 8                |
| **0x1025**  | Input   | Input digital bits            | 8                |
| **0x2030**  | Input   | Coupler ID                    | 362              |
| **0x2031+** | Input   | Module IDs (Batch 0)          | 0x8801, 455, ... |

## Module Encoding

### Digital I/O Modules

```
Encoding: 0x8000 | (channels << 8) | (is_output << 1) | is_input
```

| Module   | Channels | Type | Encoded Value |
| -------- | -------- | ---- | ------------- |
| 750-1405 | 16       | DI   | 0x9001        |
| 750-1415 | 8        | DI   | 0x8801        |
| 750-430  | 8        | DI   | 0x8801        |
| 753-440  | 4        | DI   | 0x8401        |
| 750-1504 | 16       | DO   | 0x9002        |
| 750-1515 | 8        | DO   | 0x8802        |
| 750-530  | 8        | DO   | 0x8802        |
| 750-515  | 4        | DO   | 0x8402        |

### Analog/Special Modules

```
Encoding: Part number (decimal)
```

| Module  | Type       | Encoded Value |
| ------- | ---------- | ------------- |
| 750-362 | Coupler    | 362           |
| 750-890 | Controller | 890           |
| 750-454 | 2-Ch AI    | 454           |
| 750-455 | 4-Ch AI    | 455           |
| 750-461 | 2-Ch RTD   | 461           |
| 750-464 | 2/4-Ch RTD | 464           |
| 750-563 | 2-Ch AO    | 563           |
| 750-555 | 4-Ch AO    | 555           |

## I/O Bit Calculation

### Analog Bits

```
Analog bits = byte_count × 8
```

- Each analog channel = 2 bytes (16 bits)
- 4-Ch AI module: 4 × 2 = 8 bytes → 64 bits
- 4-Ch RTD module: 4 × 2 = 8 bytes → 64 bits

### Digital Bits

```
Digital bits = bit_count (direct)
```

- Each digital channel = 1 bit
- 8-Ch DI module: 8 bits
- 8-Ch DO module: 8 bits

## Example Configuration

### riod_rack.yaml

```yaml
modules:
  - 750-1415 # 8-Ch DI
  - 750-1515 # 8-Ch DO
  - 750-455 # 4-Ch AI
  - 750-464 # 4-Ch RTD
```

### Expected Register Values

**Module Discovery (0x2030+):**

```
0x2030[0] = 362      # Coupler
0x2030[1] = 0x8801   # 8-Ch DI
0x2030[2] = 0x8802   # 8-Ch DO
0x2030[3] = 455      # 4-Ch AI
0x2030[4] = 464      # 4-Ch RTD
0x2030[5] = 0        # End of rack
```

**I/O Bit Counts (0x1022+):**

```
0x1022 = 0     # Output analog: no AO modules
0x1023 = 128   # Input analog: (4+4) channels × 2 bytes × 8 = 128
0x1024 = 8     # Output digital: 8 DO channels
0x1025 = 8     # Input digital: 8 DI channels
```

## Rust Test Example

```rust
use app_lib::state::Simulator;

let mut sim = Simulator::new();
sim.load_rack(config);

// Read module IDs
let modules = sim.read_special_input_registers(0x2030, 6).unwrap();
assert_eq!(modules[0], 362);  // Coupler
assert_eq!(modules[1], 0x8801);  // 8-Ch DI

// Read I/O bit counts
let io_bits = sim.read_special_input_registers(0x1022, 4).unwrap();
assert_eq!(io_bits[1], 128);  // Input analog bits

// Trigger watchdog
sim.write_holding_registers(0x1003, &[0]);
```

## Key Functions (state.rs)

```rust
// Encode module ID based on type
fn encode_module_id(module_number: &str) -> u16

// Calculate I/O bit counts
fn calculate_io_bit_counts(&self) -> (u16, u16, u16, u16)

// Read discovery registers
pub fn read_special_input_registers(&self, addr: u16, cnt: u16) -> Option<Vec<u16>>

// Write watchdog registers
pub fn write_holding_registers(&mut self, addr: u16, values: &[u16])
```
