@io @digital
Feature: Digital I/O Simulation
  As a controls engineer
  I want to simulate digital inputs and observe digital outputs
  So that I can test discrete I/O logic in my PLC code

  Background:
    Given the simulator application is running
    And the user has created a rack with a digital input module "750-1405"
    And the user has added a digital output module "750-1504"

  # ============================================================================
  # Digital Input Display
  # ============================================================================

  @smoke @critical
  Scenario: Digital input module displays all channels
    When the user views the digital input module
    Then the module displays 16 input channels
    And each channel shows an LED indicator
    And each channel shows its state as "OFF" initially

  Scenario: Digital input channels show correct channel numbers
    When the user views the digital input module
    Then channel numbers 0 through 15 are displayed

  # ============================================================================
  # Digital Input Control
  # ============================================================================

  @smoke @critical
  Scenario: User toggles a digital input channel ON
    When the user selects channel 0 on the digital input module
    And the user toggles the channel to ON
    Then channel 0 shows state "ON"
    And the LED indicator for channel 0 is illuminated

  Scenario: User toggles a digital input channel OFF
    Given channel 0 on the digital input module is ON
    When the user selects channel 0 on the digital input module
    And the user toggles the channel to OFF
    Then channel 0 shows state "OFF"
    And the LED indicator for channel 0 is not illuminated

  Scenario: User sets digital input using the override panel
    When the user selects channel 5 on the digital input module
    Then the properties panel shows a toggle switch
    And the toggle switch allows setting HIGH or LOW state

  # ============================================================================
  # Digital Output Display
  # ============================================================================

  @smoke @critical
  Scenario: Digital output module displays all channels
    When the user views the digital output module
    Then the module displays 16 output channels
    And each channel shows an LED indicator

  Scenario: Digital output channels indicate read-only state
    When the user selects channel 0 on the digital output module
    Then the properties panel indicates output is controlled by Modbus client

  # ============================================================================
  # Modbus Integration - Digital Inputs
  # ============================================================================

  @modbus @integration
  Scenario: Digital inputs are readable via Modbus discrete inputs
    Given the simulation is running
    And channel 0 on the digital input module is ON
    And channel 1 on the digital input module is OFF
    When a Modbus client reads discrete inputs starting at address 0
    Then the client receives bit 0 as ON
    And the client receives bit 1 as OFF

  @modbus @integration
  Scenario: Multiple digital input channels pack into Modbus words correctly
    Given the simulation is running
    And channels 0, 2, 4, 6 on the digital input module are ON
    And channels 1, 3, 5, 7 on the digital input module are OFF
    When a Modbus client reads discrete inputs
    Then the bit pattern reflects the channel states

  # ============================================================================
  # Modbus Integration - Digital Outputs
  # ============================================================================

  @modbus @integration @critical
  Scenario: Digital outputs update when Modbus client writes coils
    Given the simulation is running
    When a Modbus client writes coil 0 to ON
    Then channel 0 on the digital output module shows state "ON"
    And the LED indicator for channel 0 is illuminated

  @modbus @integration
  Scenario: Multiple digital outputs update on Modbus write multiple coils
    Given the simulation is running
    When a Modbus client writes coils 0-7 with pattern 0xAA
    Then channels 1, 3, 5, 7 show state "ON"
    And channels 0, 2, 4, 6 show state "OFF"

  # ============================================================================
  # Visual Indicators
  # ============================================================================

  Scenario: Digital input LED shows green when ON
    Given channel 0 on the digital input module is ON
    Then the LED indicator for channel 0 is green

  Scenario: Digital output LED shows red when ON
    Given the simulation is running
    And a Modbus client writes coil 0 to ON
    Then the LED indicator for channel 0 on digital output is red
