@reactive @scenarios
Feature: Reactive Scenarios
  As a controls engineer
  I want to define and run reactive scenarios
  So that I/O channels respond automatically to create realistic simulation behaviors

  Background:
    Given the simulator application is running
    And the user has loaded a configuration with reactive scenarios

  # ============================================================================
  # Scenario Selection
  # ============================================================================

  @smoke @critical
  Scenario: User views available reactive scenarios in dropdown
    When the user views the reactive scenario dropdown in the toolbar
    Then the dropdown shows all available reactive scenarios
    And the default scenario is marked with a "Default" badge

  @smoke @critical
  Scenario: User activates a reactive scenario
    When the user selects scenario "Sunny Day" from the reactive dropdown
    Then the scenario "Sunny Day" becomes active
    And the toolbar shows the active scenario name
    And the behavior count badge shows the number of behaviors

  @smoke
  Scenario: User disables reactive scenarios
    Given reactive scenario "Sunny Day" is active
    When the user selects "None (Disabled)" from the reactive dropdown
    Then no reactive scenario is active
    And the toolbar shows "Reactive: None"

  # ============================================================================
  # Default Scenario Auto-Load
  # ============================================================================

  @critical
  Scenario: Default reactive scenario loads automatically on startup
    Given the configuration has a default reactive scenario
    When the user loads the configuration
    Then the default reactive scenario is automatically activated
    And the reactive behaviors begin executing

  Scenario: No scenario activates if no default is defined
    Given the configuration has no default reactive scenario
    When the user loads the configuration
    Then no reactive scenario is active
    And the toolbar shows "Reactive: None"

  # ============================================================================
  # Reactive Behavior Execution
  # ============================================================================

  @critical
  Scenario: Direct mapping behavior copies input to output
    Given a reactive scenario with direct mapping from DI channel 0 to DI channel 1
    And the reactive scenario is active
    When the user sets DI channel 0 to ON
    Then DI channel 1 becomes ON

  Scenario: Inverted mapping behavior inverts input to output
    Given a reactive scenario with inverted mapping from DI channel 0 to DI channel 1
    And the reactive scenario is active
    When the user sets DI channel 0 to ON
    Then DI channel 1 becomes OFF

  Scenario: Constant mapping behavior sets fixed value
    Given a reactive scenario with constant mapping setting DI channel 5 to ON
    And the reactive scenario is active
    Then DI channel 5 shows state ON
    And the value remains constant regardless of other inputs

  # ============================================================================
  # Delayed Behaviors
  # ============================================================================

  Scenario: Behavior with delay waits before applying value
    Given a reactive scenario with direct mapping and 500ms delay
    And the reactive scenario is active
    When the user sets the source channel to ON
    Then the target channel does not change immediately
    And after 500ms the target channel becomes ON

  Scenario: Delayed behavior shows pending state in debug panel
    Given a reactive scenario with direct mapping and 500ms delay
    And the reactive scenario is active
    When the user sets the source channel to ON
    Then the debug panel shows the behavior as "Pending"
    And the pending value is displayed

  # ============================================================================
  # Scenario Switching
  # ============================================================================

  @critical
  Scenario: Switching scenarios clears pending delays
    Given reactive scenario "Sunny Day" is active
    And a behavior has a pending delayed value
    When the user switches to scenario "Rainy Day"
    Then the pending delayed value is discarded
    And the new scenario behaviors begin fresh

  Scenario: Switching scenarios does not affect forced channels
    Given reactive scenario "Sunny Day" is active
    And channel 0 is forced to ON
    When the user switches to scenario "Rainy Day"
    Then channel 0 remains forced to ON

  # ============================================================================
  # Ownership and Blocking
  # ============================================================================

  @critical
  Scenario: Reactive behavior is blocked by force override
    Given a reactive scenario that sets channel 0 to ON
    And channel 0 is forced to OFF
    Then the reactive behavior cannot change channel 0
    And the debug panel shows the behavior is blocked by "Force"

  Scenario: Reactive behavior is blocked by manual override
    Given a reactive scenario that sets channel 0 to ON
    And the user has manually set channel 0 to OFF
    Then the reactive behavior cannot change channel 0
    And the debug panel shows the behavior is blocked by "Manual"

  # ============================================================================
  # Validation Errors
  # ============================================================================

  Scenario: Validation errors are displayed when loading invalid scenarios
    Given the configuration has a reactive scenario with invalid behavior
    When the user loads the configuration
    Then validation errors are displayed in the debug panel
    And each error shows the scenario name and behavior ID

  Scenario: Cycle detection prevents invalid scenario activation
    Given the configuration has a reactive scenario with circular dependencies
    When the user attempts to activate the scenario
    Then an error message indicates a cycle was detected
    And the scenario is not activated

  Scenario: Missing source reference shows validation error
    Given the configuration has a behavior with missing source channel
    When the user loads the configuration
    Then a validation error indicates "source is required for direct mapping"

  # ============================================================================
  # Debug Panel Integration
  # ============================================================================

  @smoke
  Scenario: Debug panel shows active behaviors
    Given reactive scenario "Sunny Day" is active
    When the user expands the Reactive Debug panel
    Then the panel shows all behaviors in the scenario
    And each behavior shows its mapping type and channels

  Scenario: Debug panel shows behavior details
    Given reactive scenario "Sunny Day" is active
    When the user expands the Reactive Debug panel
    Then each behavior shows:
      | Field              | Description                    |
      | Behavior ID        | Unique identifier              |
      | Source Channel     | Module position and channel    |
      | Target Channel     | Module position and channel    |
      | Mapping Type       | direct, inverted, or constant  |
      | Delay              | Milliseconds if configured     |
      | Last Source Value  | Last read value from source    |
      | Blocked By         | Force or Manual if blocked     |

  Scenario: Debug panel shows validation summary badges
    Given the configuration has validation warnings
    When the user views the Reactive Debug panel header
    Then badges show counts for errors, warnings, pending, and blocked behaviors
