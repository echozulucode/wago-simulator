## 1) Overall Architecture: “Process Image” Model

At the core of the WAGO 750-362 is a **process image**:

> All I/O modules are scanned internally and mapped into a contiguous memory area (“process image”), which is then exposed via Modbus.

Conceptually:

```
[ Physical I/O Modules ]
          ↓
     Local Bus
          ↓
   Internal Process Image
          ↓
   Modbus Address Space
```

Key implications for simulation:

- You **do not address individual modules directly**
- You address offsets into a **linear memory image**
- Module order on the DIN rail defines address layout

Your simulator must therefore:

1. Build a virtual module list
2. Compute the process image layout
3. Expose it through Modbus

---

## 2) Supported Modbus Function Codes

The coupler implements standard Open Modbus/TCP functions:

| Function                 | Code | Purpose               | Maps To       |
| ------------------------ | ---- | --------------------- | ------------- |
| Read Coils               | FC1  | Digital outputs       | Process image |
| Read Discrete Inputs     | FC2  | Digital inputs        | Process image |
| Read Holding Registers   | FC3  | Analog outputs + vars | Process image |
| Read Input Registers     | FC4  | Analog inputs + vars  | Process image |
| Write Single Coil        | FC5  | DO write              | Process image |
| Write Single Register    | FC6  | AO write              | Process image |
| Write Multiple Coils     | FC15 | DO write              | Process image |
| Write Multiple Registers | FC16 | AO write              | Process image |
| Mask Write               | FC22 | Bitmask write         | Process image |
| Read/Write Registers     | FC23 | Mixed                 | Process image |

From the manual:

For simulation:

- Implement **at least** FC1, FC2, FC3, FC4, FC5, FC6, FC15, FC16
- FC22/FC23 optional unless clients use advanced writes

---

## 3) WAGO’s Modbus Addressing Model

### 3.1 Addressing Starts at Zero

WAGO uses **0-based addressing**:

> Addressing begins with 0.

So:

| Logical        | Actual |
| -------------- | ------ |
| First coil     | 0      |
| First register | 0      |

Many SCADA tools offset by +1 — your simulator should stay 0-based.

---

### 3.2 Separation by Data Type

WAGO maps each data type to its own region:

From general mapping table:

#### Digital Inputs

- FC2
- Coil area: `0x0000 – 0x01FF` (example range)

#### Digital Outputs

- FC1 / FC5 / FC15
- Coil area: `0x0000 – 0x01FF`

#### Analog Inputs

- FC4
- Input registers

#### Analog Outputs

- FC3 / FC6 / FC16
- Holding registers

They are **logically separate**, even though internally unified.

For simulation: maintain four arrays:

```cpp
bool discrete_inputs[];
bool coils[];
uint16_t input_registers[];
uint16_t holding_registers[];
```

---

## 4) Process Image Layout Rules

### 4.1 Sequential Packing

Modules are mapped strictly in physical order.

Example:

```
Coupler
[750-1425] 8 DI
[750-455 ] 2 AI
[750-530 ] 8 DO
```

Mapping:

```
DI bits 0–7
AI regs 0–1
DO bits 8–15
```

No gaps unless module requires alignment.

---

### 4.2 Bit-Level Packing for Digital Modules

Digital modules are packed bitwise.

Example (8-channel DI):

```
Register: Bit positions
Bit 0 → Channel 1
Bit 1 → Channel 2
...
Bit 7 → Channel 8
```

From mapping description:

Important:

- Multi-channel modules may span multiple bytes
- WAGO uses **little-endian bit numbering inside registers**

Simulation rule:

```cpp
bit_index = global_offset + channel_index;
byte = bit_index / 8;
bit  = bit_index % 8;
```

---

### 4.3 Analog Data = 16-bit Registers

Analog channels use 16-bit registers.

Example:

| Module  | Channels | Registers   |
| ------- | -------- | ----------- |
| 750-455 | 2 AI     | 2 registers |
| 750-460 | 4 RTD    | 4 registers |

Each channel = 1 register.

---

### 4.4 Mixed Data Modules

Some modules expose both input + output data (with diagnostics).

Manual example:

These may allocate:

- Input bits
- Output bits
- Status registers

Your simulator must model:

```json
{
  "module": "750-530",
  "inputs": 8,
  "outputs": 8,
  "diagnostics": 1
}
```

---

## 5) Configuration & Identification Registers (Unique WAGO Feature)

WAGO exposes extensive metadata via registers.

Example register block:

### 5.1 Firmware & Device Info

| Address | Purpose             |
| ------- | ------------------- |
| 0x2010  | Firmware version    |
| 0x2011  | Series code         |
| 0x2012  | Coupler code        |
| 0x2020+ | Description strings |

Simulation tip: populate realistic dummy values.

---

### 5.2 Module Description Table

Registers:

```
0x2030 – 0x2033
```

Contain descriptions of connected modules.

This is how tools auto-detect configuration.

Example:

```
Reg 0x2030 = 7501425
Reg 0x2031 = 7500455
```

Simulator should generate this from config.

---

### 5.3 Process Image Settings

Register:

```
0x2035 – Process image settings
```

Controls mapping behavior.

Most users leave default, but some SCADA systems read it.

Stub it unless advanced compatibility needed.

---

## 6) Modbus Watchdog (Critical WAGO Feature)

WAGO implements a built-in watchdog:

> If communication lapses… all analog outputs set to 0 and digital outputs OFF.

Key registers:

| Register | Purpose       |
| -------- | ------------- |
| 0x1000   | Timeout       |
| 0x1001   | Function mask |
| 0x1006   | Status        |

Behavior:

1. Client writes watchdog config
2. Certain function codes reset timer
3. If timer expires → outputs forced safe

Simulation should implement:

```cpp
if (now - last_modbus_activity > timeout) {
    zero_outputs();
}
```

This is important for realistic HIL testing.

---

## 7) Multi-Connection Support

WAGO allows:

> 15 simultaneous Modbus/TCP connections

Simulator:

- Should allow multiple clients
- Shared process image
- Lock writes

Thread-safe register access is recommended.

---

## 8) Important WAGO-Specific Behavior

### 8.1 “Use Coils for Digital, Registers for Analog”

Manual warning:

If you access digital I/O via registers, address shifts can occur.

Why:

- Analog modules inserted later change register alignment
- Bit areas remain stable

Simulation must reflect:

- Digital always in coil space
- Analog always in registers

---

### 8.2 Dynamic Layout on Startup

On boot:

1. Scan bus
2. Detect modules
3. Build image
4. Publish registers

So layout can change if modules change.

Your simulator should:

- Recompute map at startup
- Optionally support hot-reload

---

### 8.3 No PLC Runtime

From WBM page:

This coupler has **no internal PLC**:

- No user logic
- Pure I/O gateway

So your simulator doesn’t need PLC logic.

---

## 9) Typical Mapping Example (Concrete)

Configuration:

```
750-362
750-1425 (8 DI)
750-455  (2 AI)
750-530  (8 DO)
```

### Digital Inputs (FC2)

| Channel | Coil |
| ------- | ---- |
| DI1     | 0    |
| DI2     | 1    |
| ...     |      |
| DI8     | 7    |

### Analog Inputs (FC4)

| Channel | Register |
| ------- | -------- |
| AI1     | 0        |
| AI2     | 1        |

### Digital Outputs (FC1/FC5)

| Channel | Coil |
| ------- | ---- |
| DO1     | 8    |
| ...     |      |
| DO8     | 15   |

### Holding Registers (FC3)

Unused (unless AO present)

---

## 10) How to Implement a Compatible Simulator

### 10.1 Internal Model

```cpp
struct Module {
    string type;
    int di_bits;
    int do_bits;
    int ai_regs;
    int ao_regs;
    int diag_regs;
};

struct ProcessImage {
    vector<bool> di;
    vector<bool> do;
    vector<uint16_t> ai;
    vector<uint16_t> ao;
    vector<uint16_t> config;
};
```

---

### 10.2 Startup Algorithm

```text
1. Load module list
2. For each module:
   - Append bits/regs
3. Build offset table
4. Fill 0x2030+ descriptors
5. Start watchdog
6. Open TCP:502
```

---

### 10.3 Modbus Handler

Pseudo-flow:

```cpp
on_request(req):
    switch(req.fc):
        case FC1: read(coils)
        case FC2: read(di)
        case FC3: read(holding)
        case FC4: read(input)
        case FC5: write(coil)
        case FC6: write(reg)
```

All access goes through process image.

---

### 10.4 Watchdog

```cpp
on_modbus_activity():
    last_activity = now;

watchdog_thread():
    if (now-last_activity > timeout):
        clear_outputs();
```

---

### 10.5 Metadata Registers

Populate:

```
0x2010 = version
0x2011 = series
0x2030+ = module ids
```

So engineering tools recognize the node.

---

## 11) Key “Unique” WAGO Characteristics

Compared to generic Modbus devices:

### 1. Auto-Generated Process Image

No fixed map; depends on module order.

### 2. Module Description Registers

0x2030+ auto-published hardware inventory.

### 3. Built-in Watchdog

Safety behavior enforced in firmware.

### 4. Bit-Level Packing

Tight packing, no padding.

### 5. Mixed Diagnostic Data

Some modules inject status registers.

### 6. Multi-Client Support

15 concurrent masters.

These must be mirrored for realistic simulation.

---

## 12) Recommendation for Your Use Case (Simulator/HIL)

Given your context (embedded + HIL + simulation):

I’d suggest implementing:

### Phase 1 (Minimum Viable)

- Static module config
- FC1/2/3/4/5/6/15/16
- Process image
- Basic watchdog
- Metadata registers

### Phase 2 (High Fidelity)

- Diagnostics
- Mask write (FC22)
- Module descriptors
- Hot reconfiguration
- WBM-like info

This will be sufficient to fool most PLCs, HMIs, and test rigs.
