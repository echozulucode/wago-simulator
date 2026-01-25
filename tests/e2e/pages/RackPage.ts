import { Page, Locator, expect } from '@playwright/test';

export class RackPage {
  readonly page: Page;
  readonly menuBar: Locator;
  readonly toolbar: Locator;
  readonly leftPanel: Locator;
  readonly rightPanel: Locator;
  readonly workArea: Locator;
  readonly statusBar: Locator;
  readonly rackView: Locator;
  readonly couplerCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuBar = page.locator('[data-testid="menu-bar"]');
    this.toolbar = page.locator('[data-testid="toolbar"]');
    this.leftPanel = page.locator('[data-testid="left-panel"]');
    this.rightPanel = page.locator('[data-testid="right-panel"]');
    this.workArea = page.locator('[data-testid="work-area"]');
    this.statusBar = page.locator('[data-testid="status-bar"]');
    this.rackView = page.locator('[data-testid="rack-view"]');
    this.couplerCard = page.locator('[data-testid="coupler-card"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.menuBar.waitFor({ state: 'visible' });
  }

  async createNewRack() {
    // Click New Rack button in toolbar
    await this.page.locator('[data-testid="toolbar-new"]').click();
    // Wait for rack view to appear
    await this.rackView.waitFor({ state: 'visible' });
  }

  async addModuleFromCatalog(moduleNumber: string) {
    // Find the module in the catalog and click the add button
    const moduleItem = this.leftPanel.locator(`[data-module="${moduleNumber}"]`);
    await moduleItem.locator('button').click();
  }

  async selectModule(slotIndex: number) {
    const moduleSlot = this.page.locator(`[data-slot="${slotIndex}"]`);
    await moduleSlot.click();
  }

  async clickChannel(slotIndex: number, channel: number) {
    const moduleSlot = this.page.locator(`[data-slot="${slotIndex}"]`);
    const channelRow = moduleSlot.locator(`[data-channel="${channel}"]`);
    await channelRow.click();
  }

  async getChannelValue(slotIndex: number, channel: number): Promise<string> {
    const moduleSlot = this.page.locator(`[data-slot="${slotIndex}"]`);
    const channelRow = moduleSlot.locator(`[data-channel="${channel}"]`);
    const value = channelRow.locator('[data-testid="channel-value"]');
    return (await value.textContent()) ?? '';
  }

  async setDigitalInputValue(slotIndex: number, channel: number, value: boolean) {
    await this.selectModule(slotIndex);
    await this.clickChannel(slotIndex, channel);

    const toggle = this.rightPanel.locator('[data-testid="toggle-switch"]');
    const isChecked = (await toggle.getAttribute('aria-checked')) === 'true';

    if (isChecked !== value) {
      await toggle.click();
    }
  }

  async setAnalogValue(slotIndex: number, channel: number, value: number) {
    await this.selectModule(slotIndex);
    await this.clickChannel(slotIndex, channel);

    const input = this.rightPanel.locator('[data-testid="numeric-input"] input');
    await input.fill(String(value));
    await input.press('Enter');
  }

  async getConnectionStatus(): Promise<string> {
    const status = this.statusBar.locator('[data-testid="connection-status"]');
    return (await status.textContent()) ?? '';
  }

  async startSimulation() {
    await this.page.locator('[data-testid="toolbar-start"]').click();
  }

  async stopSimulation() {
    await this.page.locator('[data-testid="toolbar-stop"]').click();
  }

  async pauseSimulation() {
    await this.page.locator('[data-testid="toolbar-pause"]').click();
  }

  getModuleSlots() {
    return this.page.locator('[data-testid="module-slot"]');
  }

  async verifyLayoutVisible() {
    await expect(this.menuBar).toBeVisible();
    await expect(this.toolbar).toBeVisible();
    await expect(this.leftPanel).toBeVisible();
    await expect(this.rightPanel).toBeVisible();
    await expect(this.workArea).toBeVisible();
    await expect(this.statusBar).toBeVisible();
  }
}
