@simulation @control
Feature: Simulation Control
  As a controls engineer
  I want to start, stop, and control the simulation
  So that I can test my PLC code against the simulated I/O

  Background:
    Given the simulator application is running
    And the user has created a rack with modules

  # ============================================================================
  # Starting Simulation
  # ============================================================================

  @smoke @critical
  Scenario: User starts the simulation
    When the user starts the simulation
    Then the simulation state is "running"
    And the Modbus TCP server is listening on port 502

  Scenario: User starts simulation using keyboard shortcut
    When the user presses F5
    Then the simulation state is "running"

  Scenario: Start button is disabled when no rack exists
    Given no rack is configured
    Then the start simulation button is disabled

  Scenario: Start button is disabled when simulation is already running
    Given the simulation is running
    Then the start simulation button is disabled

  # ============================================================================
  # Stopping Simulation
  # ============================================================================

  @smoke @critical
  Scenario: User stops the simulation
    Given the simulation is running
    When the user stops the simulation
    Then the simulation state is "stopped"
    And the Modbus TCP server stops accepting connections

  Scenario: User stops simulation using keyboard shortcut
    Given the simulation is running
    When the user presses Shift+F5
    Then the simulation state is "stopped"

  Scenario: Stop button is disabled when simulation is stopped
    Given the simulation is stopped
    Then the stop simulation button is disabled

  # ============================================================================
  # Resetting I/O
  # ============================================================================

  @smoke
  Scenario: User resets all I/O to default values
    Given the simulation is running
    And digital input channels have been set to various values
    When the user resets all I/O
    Then all digital input channels are set to OFF
    And all analog input channels are set to 0

  Scenario: Reset I/O does not affect output channels
    Given the simulation is running
    And digital output channels have been written by Modbus client
    When the user resets all I/O
    Then digital output channels retain their values

  # ============================================================================
  # Status Bar Indicators
  # ============================================================================

  @smoke
  Scenario: Status bar shows simulation running state
    When the user starts the simulation
    Then the status bar shows "Running"
    And the status indicator is green

  Scenario: Status bar shows simulation stopped state
    Given the simulation is running
    When the user stops the simulation
    Then the status bar shows "Stopped"

  Scenario: Status bar shows listening state when no clients connected
    Given the simulation is running
    And no Modbus clients are connected
    Then the status bar shows "Listening"
    And the connection indicator is yellow

  Scenario: Status bar shows client count when clients are connected
    Given the simulation is running
    And a Modbus client connects to the simulator
    Then the status bar shows "1 Client Active"
    And the connection indicator is green
