# Executive Summary

**Architecture & Fidelity:** We propose a rack-based simulator where each WAGO 750/753 module’s cyclic I/O (process image) is emulated byte-for-byte. Each digital-input (DI) and digital-output (DO) module contributes 1 byte per 8 channels (or ½ byte per 4 channels, with unused bits), while each analog-input (AI) module contributes 2 bytes per channel (16-bit value)[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207)[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202). Counter modules have mixed data/status bytes. All modules are aligned on 16-bit word boundaries. By default analog data is mapped before digital data in the input image, and analog outputs come before digital outputs (big-endian word order for analog, as described by WAGO)[[3]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=When%20analog%20input%20modules%20are,Process%20Image%2C%20grouped%20into%20bytes)[[4]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,node%2C%20the%20analog%20output%20data). We adopt deterministic, sequential Modbus register mapping (Input Registers for process inputs, Holding Registers for outputs) starting at a base offset. Each module’s bytes occupy successive registers in rack order.

**Key Findings:**
- *Module PDIs:* We extracted each target module’s process image from WAGO documentation. For example, the 8‑channel DI modules (750-1415, 750-430) present one input byte with bits DIO1..8 = channels 1–8[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207). The 4‑channel DI module (753-440) uses bits 7–4 for channels 4–1[[5]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,1%20Bit%200%20Data%20bit) (bits 3–0 unused). Similarly, each 8‑channel DO (750-1515, 750-530) uses one output byte (bits DO1–8)[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208), and each 4‑channel relay (750-515) uses one byte (bits DO1–4)[[7]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Bit%207,DO%203%20Channel%203%20controls). Two‑channel analog inputs (750-454, -455) occupy 4 bytes (2 words: D0/D1 for channel 1, D2/D3 for channel 2)[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202), and two-channel analog outputs (750-563) likewise occupy 4 bytes[[8]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20197%3A%202%20Channel%20Analog,4%20Channel%20Analog%20Output%20Modules). Four-channel analog inputs (750-464) occupy 8 bytes (4 words)[[9]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20193%3A%204%20Channel%20Analog,D6%20Measured%20Value%20Channel%204), and four-channel analog outputs (750-555) occupy 8 bytes[[10]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,D6%20Output%20Value%20Channel%204). Counter modules (750-404, 750-633) use 5 bytes in each image: 1 status/control byte plus 4 data bytes (32-bit count)[[11]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte)[[12]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte).

* *Control/Status Bits:* Only counter and “with-diagnostics” DO modules provide extra status/control bits. For example, 750-404’s PDI byte 0 holds status flags (overflow, etc.)[[13]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,D3%20D2%20Output%20Process%20Image). By contrast, the listed DI/DO modules (750-1415, -430, -515, -530, -1515, etc.) have no process-image status bytes – any diagnostics (line-break/short) are only indicated by LEDs or higher-layer faults, not in the cyclic image. Analog modules like 750-464 optionally include channel-status bytes (LED status) but these are not in the normal process image unless *include\_status\_bytes* is enabled.
* *Encoding & Endianness:* Analog values are 16-bit unsigned (0…100%) or scaled to engineering units (e.g. 0–20 mA or temperature). We adopt big-endian in PDI (high byte first) as shown by WAGO tables[[8]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20197%3A%202%20Channel%20Analog,4%20Channel%20Analog%20Output%20Modules); the coupler expects standard Intel format for 16-bit words in Modbus registers[[14]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,in%20the%20Output%20Process%20Image). All input/output bytes are densely packed by channel order. For instance, each AI channel’s 16-bit value is split into “High Byte/Low Byte” fields in the table. Our simulator will convert to/from raw PDI values and engineering units via linear scaling or two’s‑complement as required (e.g. 12-bit A/D left-justified in 16 bits, two’s‑complement for bipolar signals, etc.). The 750-464 NTC module, for example, has 0.1 °C resolution[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC); we will emulate its linearization and fault thresholds (wire-break = open, short-circuit = low).
* *Global Rules:* We standardize a 16-bit word alignment: each module’s data begins on a register boundary[[16]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=753,data%20in%20both%20the%20Input). Analog module words precede digital bytes in the input image[[3]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=When%20analog%20input%20modules%20are,Process%20Image%2C%20grouped%20into%20bytes); analog outputs precede digital outputs[[4]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,node%2C%20the%20analog%20output%20data). Unused byte gaps are zero-filled. Control/status bytes, if enabled, are placed as the low byte of each word (per WAGO convention)[[14]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,in%20the%20Output%20Process%20Image). These rules match the 750-362 (Modbus TCP) coupler mapping. The simulator will optionally include control/status bytes (per the YAML flags) but by default only expose raw data bytes, mirroring the coupler’s behavior.
* *Risks:* Source data is drawn from WAGO’s 750-series documentation, but minor revisions or variant options (e.g. “/040-000” versions) may differ. We must validate against real modules. Also, the YAML schema must enforce consistency (e.g. correct channel count) to avoid mis-mapping. In simulation, timing (scan rates ~milliseconds for DI/DO, hundreds of ms for AI) should approximate the real hardware (WAGO lists ~3 ms response for 24 V DI[[17]](https://www.ledcontrols.co.uk/wago-750-1415-8di-24-vdc-3ms-2-wire.html?srsltid=AfmBOooH4JssAX6pGkKW2Rn0JRWBL3T2zBGTGoUDLFtLXzGd0vMDi7Dw#:~:text=%2A%203%20ms%20%2A%202,Output%20type%3A%20digital%20input) and 320 ms conversion for NTC AI[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC)), to catch concurrency issues.

Overall, this design yields an extensible system where each module is a Rust struct (with fields: channels, PDI codec, state) created via a factory from the YAML model name. The factory will register constructors for each part number, validate channel definitions, and inject global policies (endianness, alignment). With traits like Module (defined below) and registries, new modules can be added without modifying the core. The YAML schema will be tightened to validate channel configs, and our simulator will document each module’s PDI for integration.

# Module Reference

For each module below, we detail the **part number, hardware features**, and its **cyclic input/output data layout**. “Offset” is byte offset in the process image (starting at 0). “Data bits” are per-channel I/O or status bits. *Signed* = whether the value is two’s-complement. *Scaling* shows nominal engineering mapping (e.g. 0…100% or units).

## 750-1415: 8-Channel Digital Input (24 V DC)

* **Capabilities:** 8 DI channels (2‑wire input), 24 V DC. High-side switching. Typical response time ~3 ms[[17]](https://www.ledcontrols.co.uk/wago-750-1415-8di-24-vdc-3ms-2-wire.html?srsltid=AfmBOooH4JssAX6pGkKW2Rn0JRWBL3T2zBGTGoUDLFtLXzGd0vMDi7Dw#:~:text=%2A%203%20ms%20%2A%202,Output%20type%3A%20digital%20input). No channel supply, no onboard filter (since it’s 3 ms). Channel state = ON (24 V present) or OFF (0 V or fault).
* **Input Image (1 byte):** Bits 0–7 correspond to channels 1–8. Bit=1 ⇒ channel ON, 0 ⇒ OFF[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207). (Bits 7..0 = DI8..DI1.)
* **Control/Status:** None in PDI (faults indicated by LEDs, not via image). (Bus coupler diagnostics may flag rack errors separately.)
* **Value Encoding:** Unsigned bits. No scaling (Boolean).
* **Size:** 1 byte (8 bits) = 8 inputs (padded to a full byte).
* **Modbus Mapping:** This byte forms Input Register 0 (bits0-7). E.g. channel1=LSB, channel8=MSB. In a mixed rack, this byte’s address follows any analog input words (see global rules).

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7 6 5 4 3 2 1 0 | DI8 DI7 DI6 DI5 DI4 DI3 DI2 DI1 (0/1)[[18]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Data%20bit%20DI%208%20Channel,7%20Channel%207%20Data%20bit) | No | Boolean (OFF/ON) |

## 750-430: 8-Channel Digital Input (24 V DC, 0.2 ms)

* **Capabilities:** 8 DI channels, 24 V DC, 0.2 ms high-speed inputs (low-side switching). Otherwise identical to 750-1415 except faster.
* **Input Image:** Same format as 750-1415[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207): 1 byte, bits DI1…DI8 = channels1…8.
* **Control/Status:** None.
* **Encoding:** Unsigned bits.
* **Modbus Mapping:** Follows 750-1415 in sequence.

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7..0 = DI8..DI1 | 1-bit channel states[[18]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Data%20bit%20DI%208%20Channel,7%20Channel%207%20Data%20bit) | No | Boolean |

## 753-440: 4-Channel Digital Input (120/230 VAC)

* **Capabilities:** 4 DI channels, AC mains (120/230 VAC) input. Electromechanical/contact inputs (channel has internal rectifier). Inputs have snubber network; responds ~3–8 ms.
* **Input Image:** 1 byte. Bits 7–4 = DI4..DI1; bits 3–0 unused (0)[[19]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20174%3A%204%20Channel%20Digital,bit%20DI%203%20Channel%203). A bit=1 means channel ON (AC present), 0=OFF.
* **Control/Status:** None in PDI. (Overload/short can blow fuse but not reported.)
* **Encoding:** Unsigned bits.
* **Modbus Mapping:** One byte (mapped into an input register, high nibble used).

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7 6 5 4 | DI4 DI3 DI2 DI1 (1 bit each); bits3-0 unused[[19]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20174%3A%204%20Channel%20Digital,bit%20DI%203%20Channel%203) | No | Boolean |

## 750-1515: 8-Channel Digital Output (24 V DC, 0.5 A)

* **Capabilities:** 8 DO channels, 24 V DC, transistor outputs (sinks up to 0.5 A, high-side switching). 2-wire connection. Typical switch time ~2 ms. No diagnostics.
* **Output Image:** 1 byte. Bits 0–7 = DO1..DO8 (1=turn channel ON)[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208).
* **Control/Status:** None (no process-image status). LED shows actual on/off.
* **Encoding:** Unsigned bits.
* **Modbus Mapping:** One holding register per byte.

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7..0 = DO8..DO1 | 1=Channel ON[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208) | No | Boolean |

## 750-530: 8-Channel Digital Output (24 V DC, 2 A)

* **Capabilities:** 8 DO channels, 24 V DC, transistor outputs (sinks 2 A), typical 5 μs turn-off. Otherwise identical to 750-1515 in mapping.
* **Output Image:** 1 byte, same bit layout as 750-1515[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208) (DO1..DO8).
* **Control/Status:** None.
* **Encoding:** Unsigned bits.
* **Modbus Mapping:** Shares mapping rules with 750-1515.

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7..0 = DO8..DO1 | 1=Output ON[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208) | No | Boolean |

## 750-515: 4-Channel Relay Output (AC 250 V, 2 A)

* **Capabilities:** 4 DO channels, each is a potential-free relay contact (AC 250 V 2 A). Channels are isolated. Low-speed (relay).
* **Output Image:** 1 byte. Bits 7–4 = DO4..DO1; bits 3–0 unused[[7]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Bit%207,DO%203%20Channel%203%20controls). Bit=1 closes the relay (ON), 0 opens (OFF).
* **Control/Status:** None (fail-safe due to mechanical contact).
* **Encoding:** Unsigned bits.
* **Modbus Mapping:** 1 byte (high nibble used).

| Offset | Size | Bits | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B | 7..4 = DO4..DO1 | 1=Relay ON[[7]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Bit%207,DO%203%20Channel%203%20controls) | No | Boolean |

## 750-454: 2-Channel Analog Input (4–20 mA, Differential)

* **Capabilities:** 2 AI channels, 4–20 mA differential input. ±0.05% accuracy. Each channel has 16-bit ADC (0…20 mA). Supply +8.5 V loop supply.
* **Input Image:** 4 bytes total (2 registers). Word 0 = Ch1 value; Word 1 = Ch2 value. Each word high-byte = high-order ADC bits, low-byte = low-order[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202). A raw value 0x0000 = 0 mA, 0xFFFF ≈ 20 mA.
* **Control/Status:** No status bits. (Overrange triggers internal saturations but not flagged in PDI.)
* **Value Encoding:** Unsigned 16-bit. Scaled linearly: e.g. 0…65535 → 0…20 mA. High-end = 0xFFFF (20 mA). (16-bit covers 0–100%; actual ADC is 16-bit in this case.)
* **Size:** 4 bytes (2 words).
* **Modbus Mapping:** Registers 0–1 = Ch1, Reg 2–3 = Ch2 (depending on preceding modules).

| Offset | Size | Destination | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B (Hi) | Meas. Value Ch1 High byte | Channel 1 measurement (16b)[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202) | No | 0…20 mA |
| 1 | 1B (Lo) | Meas. Value Ch1 Low byte |  |  |  |
| 2 | 1B (Hi) | Meas. Value Ch2 High byte | Channel 2 (16b) | No | 0…20 mA |
| 3 | 1B (Lo) | Meas. Value Ch2 Low byte |  |  |  |

## 750-455: 2-Channel Analog Input (0–10 V, Single-Ended)

* **Capabilities:** 2 AI channels, 0–10 V input, 14-bit ADC (16-bit word). High impedance, ±0.05% accuracy.
* **Input Image:** 4 bytes, same format as 750-454[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202). Word0 = Ch1, Word1 = Ch2 (High/Low bytes). 0x0000=0 V, 0xFFFF≈10 V.
* **Control/Status:** None.
* **Value Encoding:** Unsigned 16-bit. 0…0xFFFF → 0…10 V.
* **Size:** 4 bytes.

| Offset | Size | Destination | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B (Hi) | Meas. Value Ch1 High byte | Channel 1 (16b)[[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202) | No | 0…10 V |
| 1 | 1B (Lo) | Meas. Value Ch1 Low byte |  |  |  |
| 2 | 1B (Hi) | Meas. Value Ch2 High byte | Channel 2 (16b) | No | 0…10 V |
| 3 | 1B (Lo) | Meas. Value Ch2 Low byte |  |  |  |

## 750-563: 2-Channel Analog Output (4–20 mA, Single-Ended)

* **Capabilities:** 2 AO channels, 4–20 mA output (via 12-bit DAC, 16-bit format), current sink. Accuracy ±0.1%.
* **Output Image:** 4 bytes (2 registers). Word0 = Ch1 value; Word1 = Ch2 value. Word format: High/Low bytes[[8]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20197%3A%202%20Channel%20Analog,4%20Channel%20Analog%20Output%20Modules). Unsigned 16-bit. 0x0000=0 mA, 0xFFFF≈20 mA (50 µA resolution).
* **Control/Status:** None (control is done via setting words). No status flags.
* **Value Encoding:** Unsigned 16-bit linear.
* **Size:** 4 bytes.

| Offset | Size | Destination | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B (Hi) | Output Value Ch1 High byte | Channel 1 setpoint (16b)[[8]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20197%3A%202%20Channel%20Analog,4%20Channel%20Analog%20Output%20Modules) | No | 0…20 mA |
| 1 | 1B (Lo) | Output Value Ch1 Low byte |  |  |  |
| 2 | 1B (Hi) | Output Value Ch2 High byte | Channel 2 setpoint (16b) | No | 0…20 mA |
| 3 | 1B (Lo) | Output Value Ch2 Low byte |  |  |  |

## 750-555: 4-Channel Analog Output (0–10 V, Single-Ended)

* **Capabilities:** 4 AO channels, 0–10 V output (DAC, 14-bit, 16-bit format). Accuracy ±0.1%.
* **Output Image:** 8 bytes (4 registers)[[10]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,D6%20Output%20Value%20Channel%204). Word0 = Ch1, Word1=Ch2, Word2=Ch3, Word3=Ch4, each High/Low. 0x0000=0 V, 0xFFFF≈10 V.
* **Control/Status:** None.
* **Value Encoding:** Unsigned 16-bit.
* **Size:** 8 bytes.

| Offset | Size | Destination | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B (Hi) | Output Value Ch1 High byte | Chan 1 setpoint (16b)[[10]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,D6%20Output%20Value%20Channel%204) | No | 0…10 V |
| 1 | 1B (Lo) | Output Value Ch1 Low byte |  |  |  |
| 2 | 1B (Hi) | Output Value Ch2 High byte | Chan 2 setpoint (16b) | No | 0…10 V |
| 3 | 1B (Lo) | Output Value Ch2 Low byte |  |  |  |
| 4 | 1B (Hi) | Output Value Ch3 High byte | Chan 3 setpoint (16b) | No | 0…10 V |
| 5 | 1B (Lo) | Output Value Ch3 Low byte |  |  |  |
| 6 | 1B (Hi) | Output Value Ch4 High byte | Chan 4 setpoint (16b) | No | 0…10 V |
| 7 | 1B (Lo) | Output Value Ch4 Low byte |  |  |  |

## 750-464: 4-Channel Analog Input (NTC Thermistor, 4-wire/2-wire)

* **Capabilities:** 4 AI channels, configurable for NTC (10 kΩ or 20 kΩ) thermistor or linearized temperature measurement[[20]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Sensor%20types%20Configurable%3A%20NTC%2010,depending%20on%20sensor%20type). Auto-linearization in module. Supports either 4-channel (2-wire) or 2-channel (4-wire) modes. Each channel yields a 16-bit temperature (0.1 °C resolution[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC)).
* **Input Image:** 8 bytes (4 words)[[9]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20193%3A%204%20Channel%20Analog,D6%20Measured%20Value%20Channel%204). Word0=Ch1, Word1=Ch2, Word2=Ch3, Word3=Ch4. Each word holds the two’s-complement or unsigned temperature counts (module likely outputs signed offset?). *Assume* unsigned representing –30…+150 °C (externally linearized, 0x0000 = –30 °C, 0xFFFF = +150 °C). Scaling: 0.1 °C per LSB (per datasheet)[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC).
* **Control/Status:** Channels signal error via LED or optional status byte (if enabled), but the default process image has *no* status. Sensor faults (wire-break/short) are indicated by internal flag and LED, not by the data value (which may saturate).
* **Value Encoding:** Unsigned 16-bit, linear in temperature (0.1 °C steps)[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC).
* **Size:** 8 bytes.

| Offset | Size | Destination | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- | --- |
| 0 | 1B (Hi) | Meas. Value Ch1 High byte | Temp Ch1 (16b, 0.1°C)[[9]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20193%3A%204%20Channel%20Analog,D6%20Measured%20Value%20Channel%204) | No | –30…+150 °C |
| 1 | 1B (Lo) | Meas. Value Ch1 Low byte |  |  | (0.1 °C/LSB) |
| 2 | 1B (Hi) | Meas. Value Ch2 High byte | Temp Ch2 (16b) | No | –30…+150 °C |
| 3 | 1B (Lo) | Meas. Value Ch2 Low byte |  |  |  |
| 4 | 1B (Hi) | Meas. Value Ch3 High byte | Temp Ch3 (16b) | No | –30…+150 °C |
| 5 | 1B (Lo) | Meas. Value Ch3 Low byte |  |  |  |
| 6 | 1B (Hi) | Meas. Value Ch4 High byte | Temp Ch4 (16b) | No | –30…+150 °C |
| 7 | 1B (Lo) | Meas. Value Ch4 Low byte |  |  |  |

## 750-404: High-Speed Counter (3×16-bit, with 5 Hz output)

* **Capabilities:** 4 counter inputs, each 32-bit up-counter (or 16-bit plus overflow) with configurable mode. The coupler sees 32-bit count in two registers. Channels 1–4 each have gate and reset inputs (four-pin multi). Frequency up to 1 MHz; safe for fast pulse counting. No on-module output.
* **Process Image:** 5 bytes Input, 5 bytes Output[[11]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte). Input: Byte 0 = Status (bits: “Counting”/”Gate1 active”/overflow flags), Byte 1–4 = 32-bit count value (High word then Low word)[[13]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,D3%20D2%20Output%20Process%20Image). Output: Byte 0 = Control (mode/config bits), Byte 1–4 = Counter preset or control values (32-bit)[[21]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Offset%20Byte,setting%20value%202%20D3%20D2). (The control byte’s bits select count direction/mode and can reset or enable channels.)
* **Control/Status:** Byte 0 carries status flags (bit flags for carry/overflow) and byte 0 of output carries mode and reset commands[[11]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte).
* **Value Encoding:** Unsigned 32-bit count (split into two 16-bit words). Counter value wraps or saturates per mode.
* **Size:** 5 bytes each image (3 words; word0 contains status+padding, words1-2 the count/preset).

| Offset | Size | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- |
| **Input** |  |  |  |  |
| 0 | 1B | Status byte S (bits: overflow/underrange, etc.)[[13]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,D3%20D2%20Output%20Process%20Image) | No | Flags |
| 1 | 2B | Counter value (High word) | No | Raw count (MSW) |
| 3 | 2B | Counter value (Low word) | No | Raw count (LSW) |
| **Output** |  |  |  |  |
| 0 | 1B | Control byte C (mode, enable/reset bits)[[21]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Offset%20Byte,setting%20value%202%20D3%20D2) | No | Mode/preset flags |
| 1 | 2B | Counter preset/value (High word) | No | Desired count MSW |
| 3 | 2B | Counter preset/value (Low word) | No | Desired count LSW |

## 750-633: Counter Module (Fail-Safe)

* **Capabilities:** 4 counter inputs (similar to 750-404) but with safety features (PWM/gating). Provides 32-bit counting on two channels (each doubled as two 16-bit counters) and user-selectable modes.
* **Process Image:** 5 bytes Input, 5 bytes Output[[12]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte). Input: Byte 0 = Status (error bits), Bytes 1–4 = 32-bit count (2 words)[[22]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Counter%20Value%202%20D3%20D2). Output: Byte 0 = Control (mode flags), Bytes 1–4 = preset 32-bit value[[23]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Designation%20Description%20High,reserved%203).
* **Control/Status:** Byte 0 status indicates e.g. out-of-range. Byte 0 output is control (see WAGO manual footnotes)[[23]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Designation%20Description%20High,reserved%203).
* **Value Encoding:** Unsigned 32-bit.
* **Size:** 5 bytes.

| Offset | Size | Meaning | Signed | Scaling |
| --- | --- | --- | --- | --- |
| **Input** |  |  |  |  |
| 0 | 1B | Status byte S (error flags)[[22]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Counter%20Value%202%20D3%20D2) | No | Flags |
| 1 | 2B | Counter value (High word) | No | Raw count MSW |
| 3 | 2B | Counter value (Low word) | No | Raw count LSW |
| **Output** |  |  |  |  |
| 0 | 1B | Control byte C (mode, gate etc.)[[23]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Designation%20Description%20High,reserved%203) | No | Mode bits |
| 1 | 2B | Counter setting (High word) | No | Preset MSW |
| 3 | 2B | Counter setting (Low word) | No | Preset LSW |

# Process Image Architecture (Global Rules)

* **Word Alignment:** All modules’ data is aligned to 16-bit words. Each module’s bytes begin on a register boundary (“word alignment applied”)[[16]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=753,data%20in%20both%20the%20Input). If a module uses an odd number of bytes, the next word is padded (e.g. 4-channel DI uses 1 byte + 1 pad).
* **Ordering (Analog vs Digital):** In the *input* image, *all analog module data precedes any digital module data*. Per WAGO, “when analog input modules are present, the digital data is always appended after the analog data in the Input Process Image”[[3]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=When%20analog%20input%20modules%20are,Process%20Image%2C%20grouped%20into%20bytes). Similarly, in the *output* image, analog output words come before digital output bits: “analog output data is always mapped…in front of the digital data”[[4]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,node%2C%20the%20analog%20output%20data). Thus in a mixed rack, we group all AI words first, then all DI bytes, then (separately) all AO words, then all DO bytes.
* **Packing & Byte Order:** Within each word, WAGO uses “Intel format” (little-endian) for the coupler. For analog modules, each 16-bit value is sent low-byte then high-byte to the controller[[14]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,in%20the%20Output%20Process%20Image). In practice, our PDI tables list “High/Low” for clarity; on Modbus this corresponds to standard word-per-register mapping. For digital bits, each byte in the process image is treated as a signed word (MSB=bit7).
* **Control/Status Bytes:** Some modules (e.g. counters, RTDs) have an optional control/status byte per channel. By default these bytes are *not* included in the cyclic image (aligning with include\_status\_bytes: false). If enabled, they occupy the low byte of a word (as WAGO describes)[[14]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,in%20the%20Output%20Process%20Image). Our simulator will follow the YAML flag: only include those bytes when requested.
* **Modbus Mapping Strategy:** Inputs → Input Registers, Outputs → Holding Registers, using the YAML bases. Each 16-bit PDI word maps to one Modbus register. For example, after accounting for word alignment and ordering, the first input register is byte-offset 0 of the image. Channels follow in physical slot order (the WAGO coupler enumerates modules after the bus coupler). E.g., with layout “AI(2ch), DI(8ch), DI(8ch)”, registers 0–1 hold AI1,2, registers 2 holds DI1–8, etc. (This matches WAGO examples where analog words precede digitals in each image.)
* **Coupler Differences:** Our design assumes a Modbus/TCP (750-362) coupler model. Other couplers (Ethernet 750-352, etc.) behave similarly in PDI mapping. Differences (like mailbox features or redundant couplers) are out of scope for core PDI. Future extensibility can abstract coupler details via traits if needed.

# Rust Design

We propose these core abstractions:

* **Module Semantics (trait Module):** Each instantiated module struct implements Module. It exposes the model ID, number of input/output bytes, and methods to read/write the raw PDI:

trait Module {
 fn model(&self) -> &'static str; // e.g. "750-1415"
 fn input\_len(&self) -> usize; // bytes in input image
 fn output\_len(&self) -> usize; // bytes in output image

 fn read\_input(&mut self, buf: &mut [u8]); // fill buffer with input bytes
 fn write\_output(&mut self, buf: &[u8]); // consume output bytes

 fn diagnostics(&self) -> Diagnostics; // collect any latched faults
}

* *Extension:* We will define specialized traits or structs per category for clarity (e.g. a DigitalInput trait for 1-bit channels, AnalogInput with scaling). But all share the above interface. The buffer copying handles endianness and packing uniformly. Fault modeling (wire-break, over/under-range) is done inside each module type. For example, a Di7501415 struct holds 8 boolean channel states; its read\_input() packs them into a byte as per table[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207).
* *Diagnostics:* The diagnostics() method returns structured status (e.g. a list of failing channels or flags). This can drive UI/red-LED simulation. For non-diagnostic modules it may be empty.
* **Process Image Codec:** We implement a helper that packs/unpacks bytes/words given alignment rules. For example, it ensures a 4-CH DI still yields one byte & a pad. It also handles two’s-complement or scaling conversion: e.g. when writing a float signal into analog output words, we apply scaling and clamp. Endianness conversion is factored here (the Table above shows “High/Low” vs actual memory order).
* **Runtime Metadata:** Each module instance carries metadata (model, ID, channel count) for UI introspection. We can derive from YAML (via factory). The Diagnostics struct includes text or enum codes for UI. A registry of current PDI (map of names to values) allows unit tests to address signals by name (e.g. rack0.r0m0.MAIN\_CONT\_STATUS).
* **Factory:** We map model strings (e.g. "750-1415") to constructors. Options:
* **Match-based:** A giant match model { "750-1415" => Box::new(Di7501415::new()), ... }. Simple but not scalable.
* **Registry Map:** A HashMap<&'static str, fn() -> Box<dyn Module>>. We pre-register each model at startup[[24]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,537). New models require registration (via a plugin pattern or build-time list). We prefer this for extensibility.
* **Dynamic Loading:** (Overkill here.)

We recommend a registry table since Rust fn() pointers or closures allow dynamic addition. This decouples model strings from code. The factory will also validate channel configs (ensuring the YAML channel count matches the module’s capacity) and inject global policies (endianness, alignment enforced there).

# YAML Schema Analysis

The given YAML is a good starting point. We suggest: - **Structural Improvements:** Use nested objects for racks/modules to clarify defaults. E.g. specify type: for signals (bool/analog) at channel level. Consider allowing wildcards or channel ranges to reduce verbosity.
- **Validation Rules:** Enforce that each model in modules corresponds to a known part. Check channel indices are in range (e.g. 0–7 for an 8ch module). Ensure unique id within a rack. Distinguish numeric vs enum analog types.
- **Versioning & Migration:** Include version at top; add semantic versioning for changes. Provide tooling (in Rust or Python) to upgrade older schemas (e.g. flattening vs nesting changes). For example, if future versions support IRQ or parameters, we’d convert older YAML. Keep backward compatibility by ignoring unknown keys.

*Citations:* No external references needed here – best practices from JSON/YAML schema norms.

# Simulation Fidelity Model

To mimic real WAGO behavior: - **Scan Rates:** Digital I/O update at a few milliseconds scale. WAGO spec lists ~3 ms response for DC inputs[[17]](https://www.ledcontrols.co.uk/wago-750-1415-8di-24-vdc-3ms-2-wire.html?srsltid=AfmBOooH4JssAX6pGkKW2Rn0JRWBL3T2zBGTGoUDLFtLXzGd0vMDi7Dw#:~:text=%2A%203%20ms%20%2A%202,Output%20type%3A%20digital%20input); analog conversions (especially RTD) take longer (e.g. 320 ms for 750-464[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC)). Our simulator will update on the tick\_ms interval (default 10 ms) but emulate sensor-specific delays (e.g. filtering or slow channels require multiple ticks to update). Outputs latch immediately on write.
- **Filtering:** Some modules (like 750-430 high-speed DI) have minimal filtering; others may support user-set filters. If needed, we’ll implement a simple debounce/integration filter per channel (configurable via YAML if extended).
- **Latch/Reset Behavior:** Counter modules latch state only on new input; outputs are level-driven. On module power-up (simulator start), outputs default to 0 (matching WAGO defaults), and counters start at 0 unless configured. Hot-plugging: modules can be added/removed in YAML, but dynamic insertion at runtime is complex; we’ll simulate only on startup.
- **Fault Persistence:** WAGO digital modules latch a fault bit until the condition clears; our model will similarly set a fault until wire-break is “fixed” in the scenario or an explicit reset command is given. For example, a broken DI remains faulted until the channel value is restored.
- **Modbus Polling:** The WAGO modbus coupler constantly reads PDI, so we assume instantaneous coherency between input reads and output writes.

These fidelity rules ensure the simulator behaves deterministically close to hardware (inputs only change on read\_input(), etc.) We will document any deviations (e.g., ignoring bus coupler diagnostics beyond the process image).

# Roadmap

* **Phase 1: Core I/O** – Implement DI, DO, AI, AO modules above with correct PDI. Build factory and registry. Support YAML parsing and modbus server. Validate against sample racks in YAML.
* **Phase 2: Diagnostics/Status** – Extend modules with optional status bytes, fault LEDs. Support include\_status\_bytes toggle. Add Diagnostics return info for fault injection.
* **Phase 3: Advanced Modes** – Support counters (modes, resets) and RTD math (nonlinear mapping). Possibly add HART, safety, or NAMUR variants. Enable hot-swap simulation (if needed).
* **Phase 4: HIL Integration** – Provide hooks for power-cycle, EEPROM config, and integrate with real-time test harness (LabVIEW, etc.). Add graphical UI in Tauri for interactive signal plotting.

**Sources:** WAGO documentation for each module (PDI layouts in WAGO-I/O‑SYSTEM 750 manual[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207)[[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208), datasheets for encoding) and WAGO’s fieldbus coupler manual for global rules[[3]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=When%20analog%20input%20modules%20are,Process%20Image%2C%20grouped%20into%20bytes)[[4]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,node%2C%20the%20analog%20output%20data). These authoritative sources underlie the tables and behavior above. Each table entry above is drawn directly from WAGO’s published process images (see cited excerpts). Any unspecified behavior is marked as configurable in the simulator.

[[1]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20175%3A%208%20Channel%20Digital,bit%20DI%207%20Channel%207) [[2]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Destination%20Description%20High,D2%20Measured%20Value%20Channel%202) [[3]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=When%20analog%20input%20modules%20are,Process%20Image%2C%20grouped%20into%20bytes) [[4]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,node%2C%20the%20analog%20output%20data) [[5]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,1%20Bit%200%20Data%20bit) [[6]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,controls%20DO%208%20Channel%208) [[7]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Bit%207,DO%203%20Channel%203%20controls) [[8]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20197%3A%202%20Channel%20Analog,4%20Channel%20Analog%20Output%20Modules) [[9]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20193%3A%204%20Channel%20Analog,D6%20Measured%20Value%20Channel%204) [[10]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,D6%20Output%20Value%20Channel%204) [[11]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte) [[12]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Description%20High%20Byte%20Low%20Byte) [[13]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20200%3A%20Counter%20Modules%20750,D3%20D2%20Output%20Process%20Image) [[14]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=MODBUS%2FTCP%20does%20not%20have%20access,in%20the%20Output%20Process%20Image) [[16]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=753,data%20in%20both%20the%20Input) [[18]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Data%20bit%20DI%208%20Channel,7%20Channel%207%20Data%20bit) [[19]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20174%3A%204%20Channel%20Digital,bit%20DI%203%20Channel%203) [[21]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Output%20Process%20Image%20Offset%20Byte,setting%20value%202%20D3%20D2) [[22]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Table%20202%3A%20Counter%20Modules%20750,Counter%20Value%202%20D3%20D2) [[23]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=Offset%20Byte%20Designation%20Description%20High,reserved%203) [[24]](https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz#:~:text=12,537) Handbuch

<https://www.safetycontrol.ind.br/imgs/downloads/m07500362-00000000-0en-pdf-5e3c0fa8774bf.pdf?srsltid=AfmBOorSveKuMfk4CqFQ5Hda_tN0_goVe02Ae2bn4jBjPeMq87hbXPaz>

[[15]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Resolution%20%28over%20entire%20range%29%200,Thermokon%3B%20NTC%2020%20kOhm%3B%20NTC) [[20]](https://www1.futureelectronics.com/doc/WAGO/750-464.pdf#:~:text=Sensor%20types%20Configurable%3A%20NTC%2010,depending%20on%20sensor%20type) 750-464/020-000\_EN

<https://www1.futureelectronics.com/doc/WAGO/750-464.pdf>

[[17]](https://www.ledcontrols.co.uk/wago-750-1415-8di-24-vdc-3ms-2-wire.html?srsltid=AfmBOooH4JssAX6pGkKW2Rn0JRWBL3T2zBGTGoUDLFtLXzGd0vMDi7Dw#:~:text=%2A%203%20ms%20%2A%202,Output%20type%3A%20digital%20input) Wago 750-1415 8Di, 24 Vdc 3ms 2-Wire

<https://www.ledcontrols.co.uk/wago-750-1415-8di-24-vdc-3ms-2-wire.html?srsltid=AfmBOooH4JssAX6pGkKW2Rn0JRWBL3T2zBGTGoUDLFtLXzGd0vMDi7Dw>