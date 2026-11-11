import { test, expect } from '@playwright/test';

test.describe('Phase 4: Cart, Spending Guard, Purchase Passport & Signed Approval Mandate', () => {
  test('Add product -> generate passport -> approve mandate -> modify cart -> passport shows invalidated', async ({
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

    // Ensure clean cart state for deterministic test isolation
    await page.evaluate(async () => {
      await fetch('/api/cart', { method: 'DELETE' });
    });

    // 2. Navigate to AI Workspace
    await page.goto('http://localhost:3000/workspace');
    await expect(page.locator('text=AEGIS AGENT GATEWAY: ACTIVE')).toBeVisible();

    // 3. Search for a mouse to get an affordable item
    const inputField = page.locator('input[placeholder*="Ask SHOPMATE AI"]');
    await inputField.fill('Find a wireless mouse under $50');
    await page.click('button:has-text("Send")');

    // Wait for product cards to appear
    await expect(page.locator('span:has-text("Sample data")').first()).toBeVisible({
      timeout: 15000
    });

    // 4. Click Add to Cart on the first product
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn).toBeEnabled();
    await addToCartBtn.click();

    // Verify right panel cart summary reflects the addition
    await expect(page.locator('text=CART SUMMARY (1)')).toBeVisible({ timeout: 8000 });

    // 5. Click the Passport button from the Cart Live Summary
    const passportNavBtn = page.locator('button:has-text("Passport →")');
    await expect(passportNavBtn).toBeEnabled();
    await passportNavBtn.click();

    // 6. Verify we land on Passport page
    await page.waitForURL('**/passport?id=*', { timeout: 10000 });
    const passportUrl = page.url();

    await expect(page.locator('h1:has-text("Purchase Passport")')).toBeVisible();
    await expect(page.locator('text=AWAITING APPROVAL')).toBeVisible();
    await expect(page.locator('text=AEGIS HEURISTIC').first()).toBeVisible();
    await expect(page.locator('text=Exact Total')).toBeVisible();

    // 7. Click Approve to issue Signed Approval Mandate
    const approveBtn = page.getByRole('button', { name: 'Approve & Issue Signed Mandate' });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify HMAC-SHA256 AUTHORIZED status and Mandate details
    await expect(page.locator('text=HMAC-SHA256 AUTHORIZED')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=HMAC-SHA256 SIGNED APPROVAL MANDATE')).toBeVisible();
    await expect(page.locator('text=Single-Use Guaranteed')).toBeVisible();
    await expect(page.locator('text=Canonical HMAC-SHA256')).toBeVisible();
    await expect(page.locator('button:has-text("Copy")')).toBeVisible();

    // 8. Modify the Cart (quantity adjustment)
    await page.goto('http://localhost:3000/cart');
    await expect(page.locator('text=Your Shopping Cart')).toBeVisible();

    // Find the Plus button and click it to increment quantity
    const plusBtn = page.locator('button:has(svg.lucide-plus)').first();
    await plusBtn.click();

    // Wait for quantity to become 2
    await expect(page.locator('span:has-text("2")').first()).toBeVisible({ timeout: 5000 });

    // 9. Return to the previously approved Purchase Passport
    await page.goto(passportUrl);

    // 10. Verify that the Passport is now INVALIDATED
    await expect(page.locator('text=PURCHASE PASSPORT INVALIDATED')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=INVALIDATED').first()).toBeVisible();
    await expect(
      page.locator('text=Cart contents modified after passport generation')
    ).toBeVisible();
  });
});
