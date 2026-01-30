@modbus @integration
Feature: Modbus TCP Communication
  As a controls engineer
  I want the simulator to respond to Modbus TCP requests
  So that my PLC code can communicate with the simulated I/O as if it were real hardware

  Background:
    Given the simulator application is running
    And the user has created a rack with digital and analog modules
    And the simulation is running

  # ============================================================================
  # Server Startup and Connectivity
  # ============================================================================

  @smoke @critical
  Scenario: Modbus TCP server starts when simulation begins
    Then the Modbus TCP server is listening on port 502
    And the server accepts connections from Modbus clients

  Scenario: Server uses configured port from YAML
    Given the configuration specifies port 5020
    When the simulation starts
    Then the Modbus TCP server is listening on port 5020

  Scenario: Server uses configured unit ID
    Given the configuration specifies unit ID 2
    When a Modbus client connects with unit ID 2
    Then the server responds to requests

  # ============================================================================
  # Client Connection Management
  # ============================================================================

  @smoke
  Scenario: Status bar shows when client connects
    When a Modbus client connects to the simulator
    Then the status bar shows "1 Client Active"
    And the connection indicator turns green

  Scenario: Status bar shows multiple client count
    When 3 Modbus clients connect to the simulator
    Then the status bar shows "3 Clients Active"

  Scenario: Status bar updates when client disconnects
    Given a Modbus client is connected
    When the client disconnects
    Then the status bar shows "Listening"
    And the connection indicator turns yellow

  # ============================================================================
  # Discrete Inputs (Function Code 02)
  # ============================================================================

  @critical
  Scenario: Client reads discrete inputs for digital input channels
    Given digital input channel 0 is set to ON
    And digital input channel 1 is set to OFF
    When a Modbus client reads discrete inputs at address 0 for 16 bits
    Then bit 0 is ON
    And bit 1 is OFF

  Scenario: Discrete inputs pack multiple modules correctly
    Given the rack has two 16-channel digital input modules
    And channel 0 of module 1 is ON
    And channel 0 of module 2 is ON
    When a Modbus client reads discrete inputs at address 0 for 32 bits
    Then bit 0 is ON (module 1, channel 0)
    And bit 16 is ON (module 2, channel 0)

  # ============================================================================
  # Coils (Function Codes 01, 05, 15)
  # ============================================================================

  @critical
  Scenario: Client reads coils for digital output channels
    Given digital output channel 0 is ON
    When a Modbus client reads coils at address 0 for 16 bits
    Then bit 0 is ON

  @critical
  Scenario: Client writes single coil
    When a Modbus client writes single coil at address 0 to ON
    Then digital output channel 0 shows state ON
    And the UI updates to reflect the change

  @critical
  Scenario: Client writes multiple coils
    When a Modbus client writes multiple coils at address 0 with value 0xFF00
    Then digital output channels 0-7 show state ON
    And digital output channels 8-15 show state OFF

  # ============================================================================
  # Input Registers (Function Code 04)
  # ============================================================================

  @critical
  Scenario: Client reads input registers for analog input channels
    Given analog input channel 0 is set to 12.0 mA
    When a Modbus client reads input register at address 0
    Then the register value corresponds to 12.0 mA

  Scenario: Client reads multiple input registers
    Given analog input channel 0 is set to 4.0 mA
    And analog input channel 1 is set to 20.0 mA
    When a Modbus client reads input registers at address 0 for 2 registers
    Then register 0 corresponds to 4.0 mA
    And register 1 corresponds to 20.0 mA

  Scenario: Client reads RTD temperature values
    Given RTD channel 0 is set to 100.0 °C
    When a Modbus client reads input register at the RTD address
    Then the register value represents 100.0 °C (1000 in 0.1°C units)

  # ============================================================================
  # Holding Registers (Function Codes 03, 06, 16)
  # ============================================================================

  @critical
  Scenario: Client reads holding registers for analog output channels
    When a Modbus client reads holding register at address 0
    Then the register value reflects the current analog output value

  @critical
  Scenario: Client writes single holding register
    When a Modbus client writes single holding register at address 0 with value 0x7FFF
    Then analog output channel 0 updates to approximately 12.0 mA

  Scenario: Client writes multiple holding registers
    When a Modbus client writes multiple holding registers starting at address 0
    Then all corresponding analog output channels update

  # ============================================================================
  # Special Registers - Watchdog (0x1000)
  # ============================================================================

  Scenario: Client configures watchdog timeout
    When a Modbus client writes to watchdog register 0x1000 with timeout value
    Then the watchdog is configured with the specified timeout

  Scenario: Watchdog triggers on communication loss
    Given the watchdog is configured with 1000ms timeout
    When no Modbus communication occurs for 1000ms
    Then the watchdog triggers
    And outputs are set to safe state

  # ============================================================================
  # Special Registers - Metadata (0x2000+)
  # ============================================================================

  Scenario: Client reads coupler identification
    When a Modbus client reads input registers at address 0x2000
    Then the response contains the coupler model identification

  Scenario: Client reads module count
    When a Modbus client reads the module count register
    Then the response indicates the number of modules in the rack

  # ============================================================================
  # Error Handling
  # ============================================================================

  Scenario: Client receives exception for invalid address
    When a Modbus client reads coils at an address beyond the configured range
    Then the client receives Modbus exception code 02 (Illegal Data Address)

  Scenario: Client receives exception for invalid function code
    When a Modbus client sends an unsupported function code
    Then the client receives Modbus exception code 01 (Illegal Function)

  # ============================================================================
  # Performance and Timing
  # ============================================================================

  Scenario: Server responds within acceptable latency
    When a Modbus client sends a read request
    Then the server responds within 10ms

  Scenario: UI updates at 10Hz polling rate
    When a Modbus client rapidly writes values
    Then the UI reflects changes within 100ms
