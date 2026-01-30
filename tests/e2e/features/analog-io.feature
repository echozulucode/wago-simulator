@io @analog
Feature: Analog I/O Simulation
  As a controls engineer
  I want to simulate analog inputs and outputs
  So that I can test analog signal processing in my PLC code

  Background:
    Given the simulator application is running
    And the user has created a rack

  # ============================================================================
  # Analog Input Display (4-20mA)
  # ============================================================================

  @smoke @critical
  Scenario: Analog input module displays all channels
    Given the user has added analog input module "750-455"
    When the user views the analog input module
    Then the module displays 4 input channels
    And each channel shows its current value
    And values are displayed in milliamps (mA)

  Scenario: Analog input channels default to zero
    Given the user has added analog input module "750-455"
    Then all analog input channels show value "0.00 mA"

  # ============================================================================
  # Analog Input Control
  # ============================================================================

  @smoke @critical
  Scenario: User sets analog input value using slider
    Given the user has added analog input module "750-455"
    When the user selects channel 0 on the analog input module
    And the user sets the slider to 12.0 mA
    Then channel 0 shows value "12.00 mA"

  Scenario: User sets analog input value using numeric input
    Given the user has added analog input module "750-455"
    When the user selects channel 0 on the analog input module
    And the user enters value "16.50" in the numeric input
    Then channel 0 shows value "16.50 mA"

  Scenario: Analog input enforces valid range
    Given the user has added analog input module "750-455"
    When the user selects channel 0 on the analog input module
    Then the slider range is 0 to 24 mA
    And the numeric input accepts values from 0 to 24

  # ============================================================================
  # RTD Temperature Input Display
  # ============================================================================

  @smoke
  Scenario: RTD module displays temperature channels
    Given the user has added RTD module "750-461"
    When the user views the RTD module
    Then the module displays 2 temperature channels
    And values are displayed in degrees Celsius

  Scenario: RTD channels default to zero degrees
    Given the user has added RTD module "750-461"
    Then all RTD channels show value "0.0 °C"

  # ============================================================================
  # RTD Temperature Input Control
  # ============================================================================

  Scenario: User sets RTD temperature value
    Given the user has added RTD module "750-461"
    When the user selects channel 0 on the RTD module
    And the user sets the slider to 25.5 °C
    Then channel 0 shows value "25.5 °C"

  Scenario: RTD input enforces Pt100 range
    Given the user has added RTD module "750-461"
    When the user selects channel 0 on the RTD module
    Then the slider range is -200 to 850 °C
    And the properties panel shows "Pt100 range: -200 to +850 °C"

  # ============================================================================
  # Analog Output Display
  # ============================================================================

  Scenario: Analog output module displays all channels
    Given the user has added analog output module "750-563"
    When the user views the analog output module
    Then the module displays 2 output channels
    And each channel shows its current value

  Scenario: Analog output indicates client control
    Given the user has added analog output module "750-563"
    When the user selects channel 0 on the analog output module
    Then the properties panel indicates output is controlled by Modbus client

  # ============================================================================
  # Modbus Integration - Analog Inputs
  # ============================================================================

  @modbus @integration
  Scenario: Analog input values are readable via Modbus input registers
    Given the user has added analog input module "750-455"
    And the simulation is running
    And channel 0 is set to 12.0 mA
    When a Modbus client reads input register at address 0
    Then the register value represents 12.0 mA scaled appropriately

  @modbus @integration
  Scenario: RTD values are readable via Modbus input registers
    Given the user has added RTD module "750-461"
    And the simulation is running
    And channel 0 is set to 100.0 °C
    When a Modbus client reads input register at address 0
    Then the register value represents 100.0 °C scaled as 0.1°C per bit

  # ============================================================================
  # Modbus Integration - Analog Outputs
  # ============================================================================

  @modbus @integration @critical
  Scenario: Analog output updates when Modbus client writes holding register
    Given the user has added analog output module "750-563"
    And the simulation is running
    When a Modbus client writes holding register 0 with value 0x7FFF
    Then channel 0 on the analog output module shows approximately 12.0 mA

  @modbus @integration
  Scenario: Analog output display updates in real-time
    Given the user has added analog output module "750-563"
    And the simulation is running
    When a Modbus client continuously writes varying values to holding register 0
    Then the analog output display updates to reflect each new value
