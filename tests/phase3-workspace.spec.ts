import { test, expect } from '@playwright/test';

test.describe('Phase 3: AI Workspace, Intent Agent, Product Cards & Security Intercept', () => {
  test('login -> navigate to workspace -> search laptop -> verify cards & sample badge -> follow-up cheaper -> search adversarial item', async ({
    page
  }) => {
    // 1. Log in with demo account
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'demo@shopmate.ai');
    await page.fill('input[type="password"]', 'DemoPass123!');
    await page.click('button[type="submit"]');

    // Wait to land on dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Welcome back, Jane Doe')).toBeVisible();

    // 2. Navigate to AI Workspace
    await page.goto('http://localhost:3000/workspace');
    await expect(page.locator('text=AEGIS AGENT GATEWAY: ACTIVE')).toBeVisible();
    await expect(page.locator('text=UNDERSTOOD REQUIREMENTS')).toBeVisible();
    await expect(page.locator('text=Offline rule-based mode')).toBeVisible();

    // 3. Send initial shopping prompt
    const initialPrompt =
      'I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD';
    const inputField = page.locator('input[placeholder*="Ask SHOPMATE AI"]');
    await inputField.fill(initialPrompt);
    await page.click('button:has-text("Send")');

    // 4. Verify assistant response arrives
    await expect(page.locator('text=I researched our verified catalogue')).toBeVisible({ timeout: 15000 });

    // 5. Verify product cards render with "Sample data" badge
    const sampleBadge = page.locator('span:has-text("Sample data")').first();
    await expect(sampleBadge).toBeVisible();

    // Verify card actions (Add to Cart enabled in Phase 4, Compare button)
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn).toBeEnabled();

    // 6. Verify Right Panel Understood Requirements
    await expect(page.locator('text=$1000 USD').first()).toBeVisible();

    // 7. Test Follow-up: "make it cheaper"
    await inputField.fill('make it cheaper');
    await page.click('button:has-text("Send")');

    // Budget in right panel reduces to $800
    await expect(page.locator('text=$800 USD').first()).toBeVisible({ timeout: 15000 });

    // 8. Test Adversarial Red Team Item Search
    await inputField.fill('Find StealthOverclock adapter');
    await page.click('button:has-text("Send")');

    // Verify the adversarial product card appears with red team warning
    await expect(
      page.locator('text=RED TEAM TEST FIXTURE (ISOLATED)')
    ).toBeVisible({ timeout: 15000 });
  });
});

