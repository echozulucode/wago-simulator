@rack @configuration
Feature: Rack Configuration
  As a controls engineer
  I want to create and manage rack configurations
  So that I can set up simulated I/O systems matching my physical hardware

  Background:
    Given the simulator application is running

  # ============================================================================
  # Creating Racks
  # ============================================================================

  @smoke @critical
  Scenario: User creates a new empty rack
    When the user creates a new rack
    Then a rack view is displayed
    And the rack contains the 750-362 fieldbus coupler

  @smoke
  Scenario: User creates a rack with a custom name
    When the user creates a new rack named "Test Bench Alpha"
    Then the rack is named "Test Bench Alpha"
    And the rack view is displayed

  # ============================================================================
  # Loading Configurations
  # ============================================================================

  @smoke @critical
  Scenario: User loads an existing configuration file
    When the user opens configuration file "test_rack.yaml"
    Then the rack configuration is loaded
    And the modules from the file are displayed in the rack

  Scenario: User sees an error when loading an invalid configuration
    When the user opens configuration file "invalid_config.yaml"
    Then an error message indicates the configuration is invalid

  Scenario: User cancels the file open dialog
    When the user opens the file dialog and cancels
    Then no configuration changes occur

  # ============================================================================
  # Saving Configurations
  # ============================================================================

  @smoke
  Scenario: User saves the current configuration
    Given the user has created a rack with modules
    And the configuration has been saved previously
    When the user saves the configuration
    Then the configuration is saved to the existing file

  Scenario: User saves a new configuration with Save As
    Given the user has created a rack with modules
    When the user saves the configuration as "new_config.yaml"
    Then the configuration is saved to "new_config.yaml"

  # ============================================================================
  # Closing Racks
  # ============================================================================

  @smoke
  Scenario: User closes the current rack
    Given the user has created a rack
    When the user closes the rack
    Then the work area shows the empty state
    And no modules are displayed

  Scenario: User is prompted to save unsaved changes before closing
    Given the user has created a rack with unsaved changes
    When the user attempts to close the rack
    Then a confirmation dialog appears
