@force @overrides @reactive
Feature: Force Overrides
  As a controls engineer
  I want to force I/O channels to specific values
  So that I can test edge cases and override automatic behaviors during debugging

  Background:
    Given the simulator application is running
    And the user has created a rack with modules
    And the simulation is running

  # ============================================================================
  # Force Enable/Disable via Right Panel
  # ============================================================================

  @smoke @critical
  Scenario: User enables force on a digital input channel
    Given the user has added digital input module "750-1405"
    When the user selects channel 0 on the digital input module
    And the user enables the force toggle
    Then channel 0 is marked as forced
    And the force indicator shows on channel 0

  @smoke @critical
  Scenario: User disables force on a channel
    Given the user has added digital input module "750-1405"
    And channel 0 is forced to ON
    When the user selects channel 0 on the digital input module
    And the user disables the force toggle
    Then channel 0 is no longer forced
    And the force indicator is removed from channel 0

  # ============================================================================
  # Force Value Control
  # ============================================================================

  @smoke
  Scenario: User sets forced digital value to ON
    Given the user has added digital input module "750-1405"
    When the user selects channel 0 on the digital input module
    And the user enables the force toggle
    And the user sets the force value to ON
    Then channel 0 shows state "ON"
    And the value is maintained regardless of other inputs

  Scenario: User sets forced digital value to OFF
    Given the user has added digital input module "750-1405"
    And channel 0 normally shows state "ON"
    When the user forces channel 0 to OFF
    Then channel 0 shows state "OFF"
    And the force indicator shows on channel 0

  Scenario: User sets forced analog value
    Given the user has added analog input module "750-455"
    When the user selects channel 0 on the analog input module
    And the user enables the force toggle
    And the user enters force value "15.5"
    Then channel 0 shows value "15.50 mA"
    And the force indicator shows on channel 0

  # ============================================================================
  # Context Menu Force Actions
  # ============================================================================

  @smoke
  Scenario: User forces channel ON via context menu
    Given the user has added digital input module "750-1405"
    When the user right-clicks on channel 0
    And the user selects "Force ON" from the context menu
    Then channel 0 is forced to ON
    And the force indicator shows on channel 0

  Scenario: User forces channel OFF via context menu
    Given the user has added digital input module "750-1405"
    When the user right-clicks on channel 0
    And the user selects "Force OFF" from the context menu
    Then channel 0 is forced to OFF
    And the force indicator shows on channel 0

  @smoke
  Scenario: User clears force via context menu
    Given the user has added digital input module "750-1405"
    And channel 0 is forced to ON
    When the user right-clicks on channel 0
    And the user selects "Clear Force" from the context menu
    Then channel 0 is no longer forced

  # ============================================================================
  # Force Visual Indicators
  # ============================================================================

  @smoke
  Scenario: Forced channel displays visual indicator
    Given the user has added digital input module "750-1405"
    When the user forces channel 0 to ON
    Then channel 0 shows the lightning bolt (Zap) icon
    And channel 0 row is highlighted in orange

  Scenario: Properties panel shows FORCED badge for forced channel
    Given the user has added digital input module "750-1405"
    And channel 0 is forced to ON
    When the user selects channel 0
    Then the properties panel shows "FORCED" badge
    And the force controls section is highlighted

  # ============================================================================
  # Force Override Precedence
  # ============================================================================

  @critical
  Scenario: Force overrides manual channel value
    Given the user has added digital input module "750-1405"
    And the user has manually set channel 0 to OFF
    When the user forces channel 0 to ON
    Then channel 0 shows state "ON"
    And the forced value takes precedence

  @critical
  Scenario: Force overrides reactive scenario behavior
    Given the user has added digital input module "750-1405"
    And a reactive scenario is active that sets channel 0
    When the user forces channel 0 to OFF
    Then channel 0 shows state "OFF"
    And the reactive scenario cannot change the forced value

  # ============================================================================
  # Force on Output Channels (Shadow Writes)
  # ============================================================================

  @modbus @critical
  Scenario: Forced output ignores Modbus writes
    Given the user has added digital output module "750-1504"
    And channel 0 on the output module is forced to ON
    When a Modbus client writes coil 0 to OFF
    Then channel 0 on the output module remains ON
    And the Modbus write is recorded as a shadow value

  Scenario: Shadow value is displayed in debug panel
    Given the user has added digital output module "750-1504"
    And channel 0 on the output module is forced to ON
    When a Modbus client writes coil 0 to OFF
    Then the debug panel shows the shadow value for channel 0

  # ============================================================================
  # Clearing Force and Reversion
  # ============================================================================

  @critical
  Scenario: Clearing force reverts to manual value if set
    Given the user has added digital input module "750-1405"
    And the user has manually set channel 0 to ON
    And channel 0 is forced to OFF
    When the user clears the force on channel 0
    Then channel 0 reverts to ON (the manual value)

  Scenario: Clearing force reverts to scenario value if active
    Given the user has added digital input module "750-1405"
    And a reactive scenario sets channel 0 to ON
    And channel 0 is forced to OFF
    When the user clears the force on channel 0
    Then channel 0 reverts to the scenario-controlled value

  Scenario: Clearing force reverts to default if no other source
    Given the user has added digital input module "750-1405"
    And channel 0 is forced to ON
    And no manual value or scenario controls channel 0
    When the user clears the force on channel 0
    Then channel 0 reverts to OFF (the default value)

  # ============================================================================
  # Normal Controls Disabled When Forced
  # ============================================================================

  Scenario: Normal value controls are disabled when channel is forced
    Given the user has added digital input module "750-1405"
    And channel 0 is forced to ON
    When the user selects channel 0
    Then the normal toggle switch is disabled
    And only the force controls are active
