# Wago I/O Module Special Case Handling

This document identifies special case handling and scaling configurations for various Wago I/O modules).

---

## Table of Contents

- [Analog Input Modules](#analog-input-modules)
- [Analog Output Modules](#analog-output-modules)
- [RTD Input Modules](#rtd-input-modules)
- [Counter Modules](#counter-modules)
- [Digital I/O Modules](#digital-io-modules)

---

## Analog Input Modules

### 750-454: 2-Channel Analog Input (4-20mA, Differential)

**Special Scaling Configuration:**

```cpp
rawMin = 0x0000
rawMax = 0x7FF8
defaultMin = 4.0f  // mA
defaultMax = 20.0f // mA
```

**Special Cases:**

- Standard 4-20mA current loop scaling
- Raw values from `0x0000` to `0x7FF8` map to 4-20mA
- Module variation `750-454/000-001` uses identical scaling
- Supports differential input configuration
- 2 channels per module

**Scaling Formula:**

```
EU = scale * raw + offset
where scale and offset are precomputed from:
  scale = (maxValue - minValue) / (rawMax - rawMin)
  offset = minValue - scale * rawMin
```

---

### 750-455: 4-Channel Analog Input (4-20mA, Single-ended)

**Special Scaling Configuration:**

```cpp
rawMin = 0x0000
rawMax = 0x7FF0  // Note: Different from 750-454
defaultMin = 4.0f  // mA (configurable)
defaultMax = 20.0f // mA (configurable)
```

**Special Cases:**

- 4-channel single-ended inputs
- Raw max is `0x7FF0` (different from 750-454's `0x7FF8`)
- No explicit default min/max in code (inherits from general analog input builder)
- 4 channels per module

---

## Analog Output Modules

### 750-563: 2-Channel Analog Output

**Special Configuration:**

```cpp
channels = 2
rawMin = (configurable per signal)
rawMax = (configurable per signal)
defaultMin = (configurable per signal)
defaultMax = (configurable per signal)
```

**Special Cases:**

- Uses inverse scaling for output (EU → raw conversion)
- Inverse scaling formula: `raw = (EU - offset) * scaleInv`
- Clamping applied both at EU level and raw register level
- 2 channels per module

---

### 750-555: 4-Channel Analog Output

**Special Configuration:**

```cpp
channels = 4
```

**Special Cases:**

- Same scaling approach as 750-563
- 4 channels per module
- Supports clamping and inverse scaling

---

## RTD Input Modules

### 750-464: 2/4-Channel RTD Input

**Special Scaling Configuration:**

```cpp
rawMin = 0xF830  // Signed interpretation
rawMax = 0x2134  // Signed interpretation
defaultMin = -200.0f  // °C (Pt100 default)
defaultMax = 850.0f   // °C (Pt100 default)
scale = 0.1f          // Fixed scale
offset = 0.0f         // Fixed offset
```

**Special Cases:**

- **Configurable channel count:** Can be configured as 2-channel or 4-channel via `channels` config parameter
- **Signed interpretation:** Raw values are interpreted as `int16_t` (signed 16-bit integers)
- **Fixed scaling:** Always uses scale of `0.1` (divide by 10)
- **Pt100 RTD default:** Default range assumes Pt100 RTD (-200°C to 850°C)
- **Engineering units on read:** Module provides temperature values in tenths of a degree
- **Custom scaling allowed:** Config file can override scale/offset for alternate units
- **Clamping always enabled:** Values are clamped to min/max range

**Data Interpretation:**

```cpp
// Raw value is signed
int16_t rawValue = static_cast<int16_t>(registerValue);
// Apply fixed scale (0.1)
float temperature_C = 0.1f * rawValue + 0.0f;
```

**Configuration Example:**

```toml
[modules.rtd1.config]
model = "750-464"
channels = "2"  # or "4"
```

---

## Counter Modules

### 750-404: Up/Down Counter

**Special Configuration:**

```cpp
inputProcessImage = {0 bits, 3 words}
outputProcessImage = {0 bits, 3 words}
```

**Special Cases:**

- **Dual mode support:** Can operate as "updown" counter or "freq" (frequency) counter
- Mode configured via `mode` parameter (default: "updown")
- Frequency mode includes prescale support
- Single counter channel per module
- Process image: 3 input words + 3 output words

**Mode: Frequency Counter**

- Uses `FrequencyCounterChannel` class
- Configurable prescale (default: 1.0)
- Prescale applied: `frequencyValue = prescale * rawFrequencyValue`
- Then standard scaling: `scaledValue = frequencyValue * scale + offset`

**Mode: Up/Down Counter**

- Uses `CounterChannel` class
- Provides raw count values

**Special Signal Models:**

#### Model: "flowmeter"

```cpp
// Generic flowmeter configuration
GPM = (configurable, default 99, min 1.0)
K = pulsesPerGallon (configurable, default 1, min 1)

scale = 60.0 / K  // Convert pulses/sec to GPM
offset = 0.0
units = "GPM"
```

**Formula:** `Flow[GPM] = (frequency[pulses/sec] / K[pulses/gallon]) * 60`

#### Model: "OM050S514-242SS"

```cpp
// Specific flowmeter model
// 1 pulse per rotation, 99 pulses/gallon
scale = 60.0 / 99.0  // = 0.6060606...
offset = 0.0
units = "GPM"
```

#### Model: "AFB0624EH-AF00"

```cpp
// Encoder/tachometer
// 2 pulses per revolution (PPR)
scale = 60.0 / 2.0  // = 30.0
offset = 0.0
units = "RPM"
```

**Formula:** `RPM = (frequency[pulses/sec] / PPR) * 60`

#### Model: "fan"

```cpp
// Configurable fan tachometer
PPR = pulsesPerRevolution (configurable, default 2, min 1)

scale = 60.0 / PPR
offset = 0.0
units = "RPM"
```

---

### 750-633: Up/Down Counter (Intrinsically Safe)

**Special Configuration:**

```cpp
// Identical to 750-404
Same process image layout
Same dual-mode support (updown/freq)
Same channel configuration
```

**Special Cases:**

- Intrinsically safe version of 750-404
- All special handling identical to 750-404
- Supports all the same signal models

---

## Digital I/O Modules

### 750-1415: 8-Channel Digital Input (24V DC)

**Configuration:**

```cpp
channels = 8
inputProcessImage = {8 bits, 0 words}
```

**Special Cases:**

- Standard digital inputs, no special scaling
- Supports enum value mapping for state interpretation
- 8 channels per module

---

### 750-430: 8-Channel Digital Input (24V DC, Standard Temp, 3ms)

**Configuration:**

```cpp
channels = 8
inputProcessImage = {8 bits, 0 words}
```

**Special Cases:**

- Standard temperature range version
- 3ms input filter
- Otherwise identical to 750-1415

---

### 753-440: 4-Channel Digital Input (120/230 VAC)

**Configuration:**

```cpp
channels = 4
inputProcessImage = {4 bits, 0 words}
```

**Special Cases:**

- **High voltage AC inputs:** 120/230 VAC rated
- 4 channels per module
- Otherwise standard digital input handling

---

### 750-1515: 8-Channel Digital Output (24V DC)

**Configuration:**

```cpp
channels = 8
outputProcessImage = {8 bits, 0 words}
```

**Special Cases:**

- Standard digital outputs, no special handling
- 8 channels per module

---

### 750-530: 8-Channel Digital Output (24V DC, 0.5A, Standard Temp)

**Configuration:**

```cpp
channels = 8
outputProcessImage = {8 bits, 0 words}
```

**Special Cases:**

- 0.5A current per channel
- Standard temperature range
- Otherwise identical to 750-1515

---

### 750-515: 4-Channel Relay Output

**Configuration:**

```cpp
channels = 4
outputProcessImage = {4 bits, 0 words}
```

**Special Cases:**

- **Relay outputs** (vs. solid-state)
- 4 channels per module
- Standard digital output handling

---

## General Configuration Override Capabilities

All analog and counter channels support per-signal configuration overrides:

### Analog Signals

- `scale`: Direct scale factor override
- `offset`: Direct offset override
- `minValue`: Minimum engineering units value (enables clamping)
- `maxValue`: Maximum engineering units value (enables clamping)
- `units`: Engineering units string

**Note:** Specifying `scale` or `offset` disables automatic scale computation and clamping.

### Counter Signals

- All analog signal overrides
- `model`: Selects predefined counter model (flowmeter, fan, etc.)
- `GPM`: Flow rate for flowmeter model
- `K`: Pulses per gallon for flowmeter model
- `PPR`: Pulses per revolution for fan/encoder models

### Digital Signals

- `enum`: Map integer values to string descriptions

## Summary of Modules Requiring Special Handling

| Part Number | Type           | Special Handling                                                                      |
| ----------- | -------------- | ------------------------------------------------------------------------------------- |
| **750-454** | Analog Input   | Custom raw range (0x0000-0x7FF8), 4-20mA scaling                                      |
| **750-455** | Analog Input   | Custom raw range (0x0000-0x7FF0)                                                      |
| **750-464** | RTD Input      | **Signed interpretation, fixed 0.1 scale, configurable 2/4 channels, Pt100 defaults** |
| **750-404** | Counter        | **Dual mode (updown/freq), multiple signal models, flowmeter/RPM calculations**       |
| **750-633** | Counter (IS)   | **Same as 750-404, intrinsically safe variant**                                       |
| **753-440** | Digital Input  | **High voltage AC (120/230V) inputs**                                                 |
| **750-515** | Digital Output | **Relay outputs (vs solid-state)**                                                    |

All other modules use standard digital I/O handling without special scaling or interpretation.
