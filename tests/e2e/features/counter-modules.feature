@io @counter @special
Feature: Counter Module Simulation
  As a controls engineer
  I want to simulate counter modules
  So that I can test pulse counting and encoder logic in my PLC code

  Background:
    Given the simulator application is running
    And the user has created a rack with counter module "750-404"

  # ============================================================================
  # Counter Display
  # ============================================================================

  @smoke
  Scenario: Counter module displays channel with count value
    When the user views the counter module
    Then the module displays 1 counter channel
    And the channel shows the current count value
    And the count value defaults to 0

  # ============================================================================
  # Counter Control
  # ============================================================================

  Scenario: User views counter channel controls
    When the user selects channel 0 on the counter module
    Then the properties panel shows counter-specific controls
    And the current count is displayed

  # ============================================================================
  # Modbus Register Layout
  # ============================================================================

  @modbus
  Scenario: Counter status is readable via Modbus
    Given the simulation is running
    When a Modbus client reads the counter input registers
    Then the response includes:
      | Register | Description        |
      | Word 0   | Status register    |
      | Word 1   | Count LSW (low 16) |
      | Word 2   | Count MSW (high 16)|

  @modbus
  Scenario: Counter preset is writable via Modbus
    Given the simulation is running
    When a Modbus client writes to the counter holding registers
    Then the preset value can be configured via:
      | Register | Description         |
      | Word 0   | Control register    |
      | Word 1   | Preset LSW (low 16) |
      | Word 2   | Preset MSW (high 16)|

  # ============================================================================
  # Process Image Mapping
  # ============================================================================

  Scenario: Counter occupies correct process image space
    Given the rack has analog input modules before the counter
    When a Modbus client reads input registers
    Then the counter registers follow the analog input registers
    And the counter uses 3 input words and 3 output words
