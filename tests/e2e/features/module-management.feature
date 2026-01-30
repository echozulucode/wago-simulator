@modules @rack-builder
Feature: Module Management
  As a controls engineer
  I want to add and configure I/O modules in my rack
  So that I can simulate the exact hardware configuration of my system

  Background:
    Given the simulator application is running
    And the user has created a new rack

  # ============================================================================
  # Adding Modules from Catalog
  # ============================================================================

  @smoke @critical
  Scenario: User adds a digital input module from the catalog
    When the user adds module "750-1405" from the catalog
    Then the module "750-1405" appears in the rack at slot 1
    And the module shows 16 input channels

  @smoke @critical
  Scenario: User adds a digital output module from the catalog
    When the user adds module "750-1504" from the catalog
    Then the module "750-1504" appears in the rack at slot 1
    And the module shows 16 output channels

  @smoke
  Scenario: User adds an analog input module from the catalog
    When the user adds module "750-455" from the catalog
    Then the module "750-455" appears in the rack at slot 1
    And the module shows 4 analog input channels

  Scenario: User adds an RTD temperature input module
    When the user adds module "750-461" from the catalog
    Then the module "750-461" appears in the rack at slot 1
    And the module shows 2 temperature channels

  Scenario: User adds a counter module
    When the user adds module "750-404" from the catalog
    Then the module "750-404" appears in the rack at slot 1
    And the module shows 1 counter channel

  Scenario Outline: User adds various module types from catalog
    When the user adds module "<module_number>" from the catalog
    Then the module "<module_number>" appears in the rack
    And the module shows <channel_count> channels

    @digital-input
    Examples: Digital Input Modules
      | module_number | channel_count |
      | 750-1405      | 16            |
      | 750-1415      | 8             |
      | 750-430       | 8             |
      | 753-440       | 4             |

    @digital-output
    Examples: Digital Output Modules
      | module_number | channel_count |
      | 750-1504      | 16            |
      | 750-1515      | 8             |
      | 750-530       | 8             |
      | 750-515       | 4             |

    @analog
    Examples: Analog Modules
      | module_number | channel_count |
      | 750-455       | 4             |
      | 750-454       | 2             |
      | 750-563       | 2             |
      | 750-555       | 4             |

  # ============================================================================
  # Adding Multiple Modules
  # ============================================================================

  Scenario: User adds multiple modules to build a complete rack
    When the user adds module "750-1405" from the catalog
    And the user adds module "750-1504" from the catalog
    And the user adds module "750-455" from the catalog
    Then the rack contains 3 modules
    And the modules are positioned in slots 1, 2, and 3

  # ============================================================================
  # Module Selection and Properties
  # ============================================================================

  @smoke
  Scenario: User views module properties by selecting it
    Given the user has added module "750-1405" to the rack
    When the user selects the module at slot 1
    Then the properties panel shows module "750-1405"
    And the properties panel shows "16-DI 24VDC"
    And the properties panel shows type "Digital Input"

  Scenario: User views module information in properties panel
    Given the user has added module "750-455" to the rack
    When the user selects the module at slot 1
    Then the properties panel shows the slot position
    And the properties panel shows the channel count
    And the properties panel shows the process image size

  # ============================================================================
  # Rack Explorer Integration
  # ============================================================================

  @smoke
  Scenario: Rack explorer updates when modules are added
    When the user adds module "750-1405" from the catalog
    Then the rack explorer shows module "750-1405"

  Scenario: User selects module from rack explorer
    Given the user has added module "750-1405" to the rack
    When the user selects "750-1405" in the rack explorer
    Then the module is highlighted in the rack view
    And the properties panel shows module "750-1405"

  # ============================================================================
  # Removing Modules
  # ============================================================================

  Scenario: User removes a module from the rack
    Given the user has added module "750-1405" to the rack
    When the user removes the module at slot 1
    Then the rack no longer contains module "750-1405"
    And the rack explorer no longer shows module "750-1405"

  # ============================================================================
  # Drag and Drop
  # ============================================================================

  @drag-drop
  Scenario: User adds module by dragging from catalog to rack
    When the user drags module "750-1405" from the catalog to the rack
    Then the module "750-1405" appears in the rack
