@ui @shell
Feature: Application UI Shell
  As a controls engineer
  I want a clear and responsive user interface
  So that I can efficiently configure and monitor the simulated I/O system

  Background:
    Given the simulator application is running

  # ============================================================================
  # Menu Bar
  # ============================================================================

  @smoke
  Scenario: File menu provides configuration operations
    When the user opens the File menu
    Then the menu shows options for New, Open, Save, Save As, and Exit

  Scenario: Edit menu provides editing operations
    When the user opens the Edit menu
    Then the menu shows options for Undo, Redo, Cut, Copy, and Paste

  Scenario: View menu controls panel visibility
    When the user opens the View menu
    Then the menu shows toggles for Left Panel, Right Panel, and Status Bar

  Scenario: Tools menu provides utility access
    When the user opens the Tools menu
    Then the menu shows options for Modbus Monitor and Settings

  # ============================================================================
  # Toolbar
  # ============================================================================

  @smoke
  Scenario: Toolbar shows file operation buttons
    Then the toolbar shows New, Open, and Save buttons

  @smoke
  Scenario: Toolbar shows simulation control buttons
    Then the toolbar shows Start, Pause, Stop, and Reset buttons

  Scenario: Toolbar shows scenario dropdowns
    Then the toolbar shows the scripted scenario dropdown
    And the toolbar shows the reactive scenario dropdown

  Scenario: Toolbar shows zoom controls
    Then the toolbar shows Zoom In, Zoom Out, and zoom percentage

  # ============================================================================
  # Keyboard Shortcuts
  # ============================================================================

  @smoke
  Scenario Outline: User triggers action via keyboard shortcut
    When the user presses <shortcut>
    Then <action> is triggered

    Examples:
      | shortcut   | action                        |
      | Ctrl+N     | new rack dialog opens         |
      | Ctrl+O     | file open dialog opens        |
      | Ctrl+S     | configuration is saved        |
      | F5         | simulation starts             |
      | Shift+F5   | simulation stops              |
      | Ctrl+,     | settings dialog opens         |
      | Alt+F4     | application exit is triggered |

  # ============================================================================
  # Panel Visibility
  # ============================================================================

  @smoke
  Scenario: User toggles left panel visibility
    Given the left panel is visible
    When the user toggles the left panel via View menu
    Then the left panel is hidden

  Scenario: User toggles right panel visibility
    Given the right panel is visible
    When the user toggles the right panel via View menu
    Then the right panel is hidden

  Scenario: User toggles status bar visibility
    Given the status bar is visible
    When the user toggles the status bar via View menu
    Then the status bar is hidden

  # ============================================================================
  # Panel Resizing
  # ============================================================================

  Scenario: User resizes left panel
    When the user drags the left panel resize handle
    Then the left panel width changes
    And the work area adjusts accordingly

  Scenario: User resizes right panel
    When the user drags the right panel resize handle
    Then the right panel width changes
    And the work area adjusts accordingly

  # ============================================================================
  # Left Panel - Rack Explorer
  # ============================================================================

  @smoke
  Scenario: Rack explorer shows module hierarchy
    Given the user has created a rack with modules
    Then the rack explorer shows the coupler at the top
    And the rack explorer shows all modules below the coupler

  Scenario: Selecting module in explorer selects it in rack view
    Given the user has created a rack with modules
    When the user clicks a module in the rack explorer
    Then the module is highlighted in the rack view
    And the properties panel shows the module details

  # ============================================================================
  # Left Panel - Module Catalog
  # ============================================================================

  @smoke
  Scenario: Module catalog shows available modules by category
    Then the module catalog shows categories:
      | Digital Inputs  |
      | Digital Outputs |
      | Analog Inputs   |
      | Analog Outputs  |
      | Temperature     |
      | Counters        |

  Scenario: Module catalog allows adding modules via button
    When the user clicks the add button on module "750-1405" in the catalog
    Then the module is added to the rack

  # ============================================================================
  # Right Panel - Properties
  # ============================================================================

  @smoke
  Scenario: Properties panel shows module info when selected
    Given the user has created a rack with module "750-1405"
    When the user selects the module
    Then the properties panel shows:
      | Module Number   | 750-1405      |
      | Module Name     | 16-DI 24VDC   |
      | Type            | Digital Input |
      | Slot Position   | 1             |
      | Channels        | 16            |

  Scenario: Properties panel shows channel controls when channel selected
    Given the user has created a rack with module "750-1405"
    When the user selects channel 0 on the module
    Then the properties panel shows channel override controls

  # ============================================================================
  # Status Bar
  # ============================================================================

  @smoke
  Scenario: Status bar shows simulation state
    Given the simulation is running
    Then the status bar shows "Running" with green indicator

  Scenario: Status bar shows connection state
    Given the simulation is running
    And a Modbus client is connected
    Then the status bar shows "1 Client Active" with green indicator

  Scenario: Status bar shows Modbus server address
    Given the simulation is running
    Then the status bar shows the Modbus server IP and port

  # ============================================================================
  # Zoom Controls
  # ============================================================================

  Scenario: User zooms in on rack view
    When the user clicks the zoom in button
    Then the rack view zoom increases by 10%

  Scenario: User zooms out on rack view
    When the user clicks the zoom out button
    Then the rack view zoom decreases by 10%

  Scenario: User resets zoom to 100%
    Given the zoom is set to 150%
    When the user clicks the zoom percentage display
    Then the zoom resets to 100%

  Scenario: Zoom is constrained to valid range
    Then the minimum zoom is 25%
    And the maximum zoom is 200%

  # ============================================================================
  # Settings Dialog
  # ============================================================================

  Scenario: User opens settings dialog
    When the user opens the Settings dialog
    Then the dialog shows Display settings
    And the dialog shows Modbus server information

  Scenario: User toggles display options
    When the user opens the Settings dialog
    Then the user can toggle:
      | Show Channel Numbers |
      | Show Raw Values      |
      | Animate Changes      |
