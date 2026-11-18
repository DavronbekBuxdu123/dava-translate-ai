import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('local diagnostics reflects the running server and its CLI does not print secrets', async ({
  request,
  baseURL,
}) => {
  const response = await request.get('/api/ai/status');
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  expect(data.revision).toBe('gemini-audit-2');
  for (const service of ['translation', 'speech', 'transcription']) {
    expect(['gemini', 'openai']).toContain(data[service].provider);
    expect(typeof data[service].keyConfigured).toBe('boolean');
    expect(data[service]).not.toHaveProperty('apiKey');
  }
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/check-ai.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, DAVA_CHECK_URL: baseURL },
  });
  expect(stdout).toContain('gemini-audit-2');
  expect(stdout).toContain('hali jonli tekshirilmagan');
});
