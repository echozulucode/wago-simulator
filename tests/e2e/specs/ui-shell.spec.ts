import { test, expect } from '@playwright/test';
import { RackPage } from '../pages/RackPage';

test.describe('UI Shell', () => {
  test('should display all layout components', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Verify all main layout components are visible
    await rackPage.verifyLayoutVisible();
  });

  test('should display menu bar with all menus', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    const menuBar = page.locator('[data-testid="menu-bar"]');

    // Check menu items exist
    await expect(menuBar.getByText('File')).toBeVisible();
    await expect(menuBar.getByText('Edit')).toBeVisible();
    await expect(menuBar.getByText('View')).toBeVisible();
    await expect(menuBar.getByText('Simulation')).toBeVisible();
    await expect(menuBar.getByText('Tools')).toBeVisible();
    await expect(menuBar.getByText('Help')).toBeVisible();
  });

  test('should display toolbar buttons', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Check toolbar buttons exist
    await expect(page.locator('[data-testid="toolbar-new"]')).toBeVisible();
    await expect(page.locator('[data-testid="toolbar-start"]')).toBeVisible();
    await expect(page.locator('[data-testid="toolbar-pause"]')).toBeVisible();
    await expect(page.locator('[data-testid="toolbar-stop"]')).toBeVisible();
  });

  test('should display left panel with module catalog', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Check left panel sections
    await expect(rackPage.leftPanel.getByText('Rack Explorer')).toBeVisible();
    await expect(rackPage.leftPanel.getByText('Module Catalog')).toBeVisible();

    // Check some modules are listed
    await expect(rackPage.leftPanel.getByText('750-1405')).toBeVisible();
    await expect(rackPage.leftPanel.getByText('750-1504')).toBeVisible();
  });

  test('should display status bar with connection info', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Check status bar elements
    await expect(rackPage.statusBar).toContainText('Modbus:');
    await expect(rackPage.statusBar).toContainText('Clients:');
    await expect(rackPage.statusBar).toContainText('Stopped');
  });

  test('should show empty state when no rack loaded', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Check empty state
    await expect(rackPage.workArea).toContainText('No Rack Loaded');
    await expect(rackPage.workArea).toContainText('Create New Rack');
  });

  test('should toggle left panel with keyboard shortcut', async ({ page }) => {
    const rackPage = new RackPage(page);
    await rackPage.goto();

    // Panel should be visible initially
    await expect(rackPage.leftPanel).toBeVisible();

    // Toggle with Ctrl+E
    await page.keyboard.press('Control+e');

    // Panel should be hidden
    await expect(rackPage.leftPanel).not.toBeVisible();

    // Toggle again
    await page.keyboard.press('Control+e');

    // Panel should be visible again
    await expect(rackPage.leftPanel).toBeVisible();
  });
});
