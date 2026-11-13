import { test, expect } from '@playwright/test';
test('homepage loads without horizontal overflow and navigation works', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Salom');
  await expect(page.getByRole('heading', { name: 'Tezkor tarjima' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (isMobile) await page.getByRole('button', { name: 'Menyuni ochish' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Sayohat iboralari' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('erkin');
});
test('theme switch and phrase filters work', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Qorong‘i', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Yorug‘', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.goto('/phrases');
  await page.getByRole('button', { name: 'Mehmonxona', exact: true }).click();
  await expect(page.locator('.phrase-card')).toHaveCount(10);
  await page.getByRole('textbox', { name: 'Iboralardan qidirish' }).fill('Wi-Fi');
  await expect(page.locator('.phrase-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Iborani saqlash' }).click();
  await expect(page.getByRole('button', { name: 'Iborani sevimlilardan olish' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('text translation and swap use deterministic test-only network mock', async ({ page }) => {
  await page.route('**/api/translate', async (route) => {
    const input = route.request().postDataJSON();
    expect(input.sourceLang).toBe('uz');
    await route.fulfill({
      json: {
        ok: true,
        data: {
          id: 'test-only',
          sourceText: input.text,
          translatedText: 'Здравствуйте!',
          sourceLang: 'uz',
          targetLang: 'ru',
          tone: 'casual',
          createdAt: new Date().toISOString(),
          favorites: [],
        },
      },
    });
  });
  await page.goto('/translate');
  await page.getByRole('textbox', { name: 'Tarjima qilinadigan matn' }).fill('Assalomu alaykum!');
  await page.getByRole('button', { name: 'Tarjima qilish', exact: true }).click();
  await expect(page.locator('.translated-text')).toHaveText('Здравствуйте!');
  await page.getByRole('button', { name: 'Tillar va matnlarni almashtirish' }).click();
  await expect(page.getByRole('textbox', { name: 'Tarjima qilinadigan matn' })).toHaveValue(
    'Здравствуйте!',
  );
  await expect(page.locator('.translated-text')).toHaveText('Assalomu alaykum!');
});
test('missing providers show a real server error instead of fake translation', async ({ page }) => {
  await page.goto('/translate');
  await page.getByRole('textbox', { name: 'Tarjima qilinadigan matn' }).fill('Salom');
  await page.getByRole('button', { name: 'Tarjima qilish', exact: true }).click();
  await expect(page.locator('.inline-error[role=alert]')).toContainText(
    /ulanmagan|sozlanmagan|OPENAI_API_KEY/,
    { timeout: 20000 },
  );
  await expect(page.locator('.translated-text')).toHaveCount(0);
});
test('offline shell searches bundled phrases without API', async ({ page, context }) => {
  await page.goto('/offline/index.html');
  await expect(page.locator('article')).toHaveCount(100);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('article')).toHaveCount(100);
  await page.getByRole('textbox', { name: 'Ibora qidirish' }).fill('метро');
  await expect(page.locator('article')).toHaveCount(1);
  await context.setOffline(false);
});

test('all main pages fit the viewport without runtime exceptions', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of [
    '/translate',
    '/conversation',
    '/history',
    '/favorites',
    '/phrases',
    '/settings',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('global phrase search updates a library that is already open', async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    'Topbar search is intentionally hidden on mobile; the library has its own search.',
  );
  await page.goto('/phrases?q=metro');
  await expect(page.locator('.phrase-card')).toHaveCount(1);
  const search = page.getByRole('textbox', { name: 'Iboralarni qidirish' });
  await search.fill('Wi-Fi');
  await search.press('Enter');
  await expect(page.locator('.phrase-card')).toHaveCount(1);
  await expect(page.locator('.phrase-card')).toContainText('Wi-Fi');
});
