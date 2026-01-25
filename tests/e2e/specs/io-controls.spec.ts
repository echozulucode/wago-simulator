import { test, expect } from '@playwright/test';
import { RackPage } from '../pages/RackPage';

test.describe('I/O Controls', () => {
  test.beforeEach(async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();
  });

  test('should display digital input channels', async ({ page }) => {
    const rackPage = new RackPage(page);

    // Add DI module
    await rackPage.addModuleFromCatalog('750-1405');

    // Check channels are displayed
    const moduleSlot = page.locator('[data-slot="0"]');
    for (let i = 0; i < 16; i++) {
      await expect(moduleSlot.locator(`[data-channel="${i}"]`)).toBeVisible();
    }
  });

  test('should show toggle control for digital inputs', async ({ page }) => {
    const rackPage = new RackPage(page);

    // Add DI module
    await rackPage.addModuleFromCatalog('750-1405');

    // Select module and channel
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Check toggle control is visible
    await expect(rackPage.rightPanel.locator('[data-testid="toggle-switch"]')).toBeVisible();
  });

  test('should show slider control for analog inputs', async ({ page }) => {
    const rackPage = new RackPage(page);

    // Add AI module
    await rackPage.addModuleFromCatalog('750-455');

    // Select module and channel
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Check slider and numeric input are visible
    await expect(rackPage.rightPanel.locator('[data-testid="value-slider"]')).toBeVisible();
    await expect(rackPage.rightPanel.locator('[data-testid="numeric-input"]')).toBeVisible();
  });

  test('should show slider control for RTD inputs', async ({ page }) => {
    const rackPage = new RackPage(page);

    // Add RTD module
    await rackPage.addModuleFromCatalog('750-461');

    // Select module and channel
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Check slider shows temperature range
    await expect(rackPage.rightPanel).toContainText('°C');
  });

  test('should show read-only display for digital outputs', async ({ page }) => {
    const rackPage = new RackPage(page);

    // Add DO module
    await rackPage.addModuleFromCatalog('750-1504');

    // Select module and channel
    await rackPage.selectModule(0);
    await rackPage.clickChannel(0, 0);

    // Should show info that it's controlled by client
    await expect(rackPage.rightPanel).toContainText('controlled by the connected client');
  });
});
