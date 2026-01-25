import { test, expect } from '@playwright/test';
import { RackPage } from '../pages/RackPage';

test.describe('Rack Builder', () => {
  test('should create a new rack', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Create new rack
    await rackPage.createNewRack();

    // Verify rack view is displayed with coupler
    await expect(rackPage.rackView).toBeVisible();
    await expect(rackPage.couplerCard).toBeVisible();
    await expect(rackPage.couplerCard).toContainText('750-362');
  });

  test('should add a module from catalog', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();

    // Add a digital input module using the + button
    await rackPage.addModuleFromCatalog('750-1405');

    // Verify module appears in rack
    const moduleSlots = rackPage.getModuleSlots();
    await expect(moduleSlots).toHaveCount(1);
    await expect(moduleSlots.first()).toContainText('750-1405');
  });

  test('should show module properties when selected', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();

    // Add and select a module
    await rackPage.addModuleFromCatalog('750-1405');
    await rackPage.selectModule(0);

    // Verify properties panel shows module info
    await expect(rackPage.rightPanel).toContainText('750-1405');
    await expect(rackPage.rightPanel).toContainText('16-DI 24VDC');
    await expect(rackPage.rightPanel).toContainText('Digital Input');
  });

  test('should update rack explorer when modules are added', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();
    await rackPage.createNewRack();

    // Add multiple modules
    await rackPage.addModuleFromCatalog('750-1405');
    await rackPage.addModuleFromCatalog('750-1504');

    // Verify modules appear in rack explorer
    await expect(rackPage.leftPanel).toContainText('750-1405');
    await expect(rackPage.leftPanel).toContainText('750-1504');
  });
});
