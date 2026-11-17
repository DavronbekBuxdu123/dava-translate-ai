import { test, expect } from '@playwright/test';

test('plays server WAV and pauses without substituting a device voice', async ({ page }) => {
  // A valid silent WAV exists only in this test; production always uses the provider.
  const sampleRate = 8000,
    bytes = sampleRate * 2 * 5;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(bytes, 40);
  let requests = 0;
  await page.route('**/api/speech', async (route) => {
    requests++;
    expect(route.request().postDataJSON().language).toBe('ru');
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: wav });
  });
  await page.goto('/phrases?category=hotel');
  await page.getByRole('button', { name: 'Talaffuzni eshitish', exact: true }).first().click();
  await expect(page.locator('.speech-source').first()).toHaveText('AI ovozi');
  await page.getByRole('button', { name: 'Ovozni pauza qilish', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ovozni davom ettirish', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ovozni to‘xtatish', exact: true }).click();
  expect(requests).toBe(1);
});
