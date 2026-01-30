import { test, expect } from '@playwright/test';
import { RackPage } from '../pages/RackPage';

test.describe('Reactive Scenarios - Force Overrides', () => {
  let rackPage: RackPage;

  test.beforeEach(async ({ page }) => {
    rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();
    // Add a digital input module for testing
    await rackPage.addModuleFromCatalog('750-1405');
  });

  test('should show force controls in right panel when channel is selected', async ({ page }) => {
    // Select module and channel
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Force controls should be visible
    const forceSection = rackPage.rightPanel.locator('text=Force Enable');
    await expect(forceSection).toBeVisible();
  });

  test('should enable force on a digital input channel', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Find and click the force toggle
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // Should show FORCED badge
    const forcedBadge = rackPage.rightPanel.locator('text=FORCED');
    await expect(forcedBadge).toBeVisible();
  });

  test('should show force indicator on channel row when forced', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Enable force
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // Check for force indicator (Zap icon) on the channel row
    const moduleSlot = page.locator('[data-slot="0"]');
    const channelRow = moduleSlot.locator('[data-channel="0"]');

    // The channel row should have force styling (orange highlight or zap icon)
    // This checks for the presence of the forced state
    const forceIndicator = channelRow.locator('svg'); // Zap icon is an SVG
    await expect(forceIndicator.first()).toBeVisible();
  });

  test('should disable force and remove indicator', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Enable force
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // Verify forced
    await expect(rackPage.rightPanel.locator('text=FORCED')).toBeVisible();

    // Disable force
    await forceToggle.click();

    // FORCED badge should be gone
    await expect(rackPage.rightPanel.locator('text=FORCED')).not.toBeVisible();
  });

  test('should show force context menu on right-click', async ({ page }) => {
    const moduleSlot = page.locator('[data-slot="0"]');
    const channelRow = moduleSlot.locator('[data-channel="0"]');

    // Right-click on channel
    await channelRow.click({ button: 'right' });

    // Context menu should appear with force options
    const contextMenu = page.locator('[role="menu"]');
    await expect(contextMenu).toBeVisible();
    await expect(contextMenu.locator('text=Force ON')).toBeVisible();
    await expect(contextMenu.locator('text=Force OFF')).toBeVisible();
    await expect(contextMenu.locator('text=Clear Force')).toBeVisible();
  });

  test('should force ON via context menu', async ({ page }) => {
    const moduleSlot = page.locator('[data-slot="0"]');
    const channelRow = moduleSlot.locator('[data-channel="0"]');

    // Right-click and select Force ON
    await channelRow.click({ button: 'right' });
    await page.locator('text=Force ON').click();

    // Verify channel is forced and ON
    await rackPage.clickChannel(0, 0);
    await expect(rackPage.rightPanel.locator('text=FORCED')).toBeVisible();
  });

  test('should clear force via context menu', async ({ page }) => {
    const moduleSlot = page.locator('[data-slot="0"]');
    const channelRow = moduleSlot.locator('[data-channel="0"]');

    // First force the channel
    await channelRow.click({ button: 'right' });
    await page.locator('text=Force ON').click();

    // Wait for force to apply
    await page.waitForTimeout(100);

    // Now clear the force
    await channelRow.click({ button: 'right' });
    await page.locator('text=Clear Force').click();

    // Verify force is cleared
    await rackPage.clickChannel(0, 0);
    await expect(rackPage.rightPanel.locator('text=FORCED')).not.toBeVisible();
  });

  test('should disable normal value controls when channel is forced', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Enable force
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // The second toggle (state toggle) should be disabled
    const stateToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').nth(1);
    await expect(stateToggle).toBeDisabled();
  });
});

test.describe('Reactive Scenarios - Debug Panel', () => {
  let rackPage: RackPage;

  test.beforeEach(async ({ page }) => {
    rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();
  });

  test('should show Reactive Debug panel in right panel', async ({ page }) => {
    // The debug panel should be collapsible at the bottom of right panel
    const debugHeader = rackPage.rightPanel.locator('text=Reactive Debug');
    await expect(debugHeader).toBeVisible();
  });

  test('should expand debug panel when clicked', async ({ page }) => {
    // Click on the debug panel header to expand
    const debugHeader = rackPage.rightPanel.locator('button:has-text("Reactive Debug")');
    await debugHeader.click();

    // Should show message about no active scenario
    const noScenarioMsg = rackPage.rightPanel.locator('text=No reactive scenario active');
    await expect(noScenarioMsg).toBeVisible();
  });
});

test.describe('Reactive Scenarios - Scenario Selector', () => {
  let rackPage: RackPage;

  test.beforeEach(async ({ page }) => {
    rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();
  });

  test('should show reactive scenario dropdown in toolbar', async ({ page }) => {
    // Look for the reactive scenario dropdown
    const reactiveDropdown = rackPage.toolbar.locator('text=Reactive:');
    await expect(reactiveDropdown).toBeVisible();
  });

  test('should show "Reactive: None" when no scenario is active', async ({ page }) => {
    const dropdown = rackPage.toolbar.locator('button:has-text("Reactive: None")');
    await expect(dropdown).toBeVisible();
  });

  test('should open dropdown and show None option', async ({ page }) => {
    // Click the reactive scenario dropdown
    const dropdown = rackPage.toolbar.locator('button:has-text("Reactive:")');
    await dropdown.click();

    // Should show None (Disabled) option
    const noneOption = page.locator('text=None (Disabled)');
    await expect(noneOption).toBeVisible();
  });
});

test.describe('Reactive Scenarios - Analog Force', () => {
  let rackPage: RackPage;

  test.beforeEach(async ({ page }) => {
    rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();
    // Add an analog input module
    await rackPage.addModuleFromCatalog('750-455');
  });

  test('should show numeric input for force value on analog channel', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Enable force
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // Should show numeric input for force value (not just toggle)
    const forceValueInput = rackPage.rightPanel.locator('text=Force Value');
    await expect(forceValueInput).toBeVisible();
  });

  test('should disable analog slider when forced', async ({ page }) => {
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Enable force
    const forceToggle = rackPage.rightPanel.locator('[data-testid="toggle-switch"]').first();
    await forceToggle.click();

    // The normal value slider should be disabled
    const slider = rackPage.rightPanel.locator('[data-testid="value-slider"]');
    await expect(slider).toBeDisabled();
  });
});
