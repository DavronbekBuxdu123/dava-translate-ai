import { test, expect } from '@playwright/test';

test('an exact phrase appears before history persistence completes, with honest source labeling', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('**/api/translate', async (route) => {
    requested = true;
    await gate;
    await route.fulfill({
      json: {
        ok: true,
        data: {
          id: 'test',
          sourceText: 'Assalomu alaykum!',
          translatedText: 'Здравствуйте!',
          sourceLang: 'uz',
          targetLang: 'ru',
          tone: 'casual',
          source: 'phrasebook',
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
  await expect(page.getByText('Tayyor ibora', { exact: true })).toBeVisible();
  expect(requested).toBe(true);
  release();
});

test('first conversation reply uses one request and renders without waiting for generated audio', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'dava-preferences',
      JSON.stringify({ autoplay: true, autoTranslate: true, sourceLang: 'uz', speed: 1 }),
    ),
  );
  let firstRequests = 0,
    oldCreates = 0;
  let releaseAudio!: () => void;
  const audioGate = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
  await page.route('**/api/conversations', async (route) => {
    oldCreates++;
    await route.fulfill({ json: { ok: false, error: { message: 'Old flow should not run' } } });
  });
  await page.route('**/api/conversations/messages', async (route) => {
    firstRequests++;
    await route.fulfill({
      json: {
        ok: true,
        data: {
          conversation: {
            id: 'c',
            title: 'Salom',
            createdAt: new Date().toISOString(),
            endedAt: null,
          },
          message: {
            id: 'm',
            sourceText: 'Salom',
            translatedText: 'Привет',
            sourceLang: 'uz',
            targetLang: 'ru',
            createdAt: new Date().toISOString(),
          },
        },
      },
    });
  });
  await page.route('**/api/speech', async (route) => {
    await audioGate;
    await route.fulfill({ status: 503, json: { ok: false, error: { message: 'test only' } } });
  });
  await page.goto('/conversation');
  await page.getByRole('textbox', { name: 'Suhbat xabari' }).fill('Salom');
  await page.getByRole('button', { name: 'Xabarni tarjima qilib yuborish' }).click();
  await expect(page.locator('.message-translation')).toContainText('Привет');
  await expect(page.getByRole('textbox', { name: 'Suhbat xabari' })).toBeEnabled();
  expect(firstRequests).toBe(1);
  expect(oldCreates).toBe(0);
  releaseAudio();
});
