import { test, expect } from '@playwright/test';

test.describe('Phase 2: Authentication, Dashboard, and Navigation Journey', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Playwright Shopper',
    email: `playwright-${timestamp}@shopmate.ai`,
    password: 'Password123!'
  };

  test('register -> land on dashboard -> logout -> login again', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('h1')).toBeVisible();

    // 2. Toggle to Register
    const createBtn = page.getByRole('button', { name: /Create Account/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    }

    // 3. Fill registration inputs
    await page.fill('input[placeholder="Jane Doe"]', testUser.name);
    await page.fill('input[placeholder="demo@shopmate.ai"]', testUser.email);
    await page.fill('input[placeholder="••••••••••••"]', testUser.password);

    // 4. Submit form
    await page.click('button[type="submit"]');

    // 5. Land on dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(new RegExp(testUser.name, 'i'));

    // 6. Verify Dashboard elements
    await expect(page.getByText('Total Policy Budget')).toBeVisible();
    await expect(page.getByText('Active Shopping Agents (DB Records)')).toBeVisible();

    // 7. Logout
    const signOutBtn = page.getByRole('button', { name: /Sign Out/i }).first();
    await signOutBtn.click();

    // 8. Redirected to login
    await page.waitForURL('**/login', { timeout: 10000 });

    // 9. Login again
    await page.fill('input[placeholder="demo@shopmate.ai"]', testUser.email);
    await page.fill('input[placeholder="••••••••••••"]', testUser.password);
    await page.click('button[type="submit"]');

    // 10. Land back on dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(new RegExp(testUser.name, 'i'));
  });
});

