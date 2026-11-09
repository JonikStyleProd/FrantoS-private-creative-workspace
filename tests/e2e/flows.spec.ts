import { test, expect, type Page } from '@playwright/test';

const fixture = (f: string) => `tests/fixtures/${f}`;
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 800;

test('landing: poster opens into its layers and into the same project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('reverse side');
  await page.getByRole('button', { name: /Behind the work: lift the poster/ }).click();
  await expect(page.getByText('Form before material').first()).toBeVisible();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.goto('/#/p/form-01/review/hero-render?v=hero-v2&cmp=hero-v1&c=c-highlight');
  await expect(page.getByText('The highlight blows out on the upper twist').first()).toBeVisible();
});

test('designer: own project, upload, second version, note survives reload', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('menuitem', { name: 'New project' }).click();
  await page.getByPlaceholder('e.g. Halden — identity').fill('E2E project');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/#\/p\/p-/);
  const pid = page.url().split('/p/')[1].split(/[/?]/)[0];

  // a wrong file explains itself, no retry for a type error
  await page.locator('input[type=file]').first().setInputFiles(fixture('notes.txt'));
  await expect(page.getByText(/only images/)).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).first().click();

  await page.goto(`/#/p/${pid}/review`);
  await page.locator('input[type=file]').first().setInputFiles(fixture('v1.png'));
  await expect(page).toHaveURL(/review\/w-/);
  await page.locator('input[type=file]').first().setInputFiles(fixture('v2.png'));
  await expect(page).toHaveURL(/cmp=/);

  // pin a note (keyboard C, then click the work)
  await page.keyboard.press('c');
  const box = (await page.locator('[style*="crosshair"]').first().boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.4);
  await page.getByRole('textbox', { name: 'Note' }).fill('Pull the blue back 10%.');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Pull the blue back 10%.').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('Pull the blue back 10%.').first()).toBeVisible();
});

test('art director: open a note, resolve and reopen, present', async ({ page }) => {
  await page.goto('/#/app');
  await page.locator('a[href*="c=c-shadow"]').first().click();
  await expect(page).toHaveURL(/c=c-shadow/);
  await page.getByRole('button', { name: 'Resolve' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await page.goto('/#/p/form-01/review/turntable?v=loop-v1&c=c-speed');
  await expect.poll(() => page.evaluate(() => document.querySelector('video')?.currentTime ?? 0)).toBeCloseTo(3.2, 1);
  await page.goto('/#/p/form-01/present/1');
  await expect(page.getByRole('button', { name: 'Back to project' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/p\/form-01/);
});

test('hebrew switches the interface to right-to-left, works stay unmirrored', async ({ page }) => {
  await page.goto('/#/app');
  await page.evaluate(() => localStorage.setItem('frantos-lang', 'he'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('ברוכים הבאים ל־FrantoS')).toBeVisible();
  await page.goto('/#/p/form-01/review/hero-render?v=hero-v2&cmp=hero-v1');
  await expect(page.locator('[dir="ltr"]').first()).toBeVisible();
});

test('a bad review link explains itself', async ({ page }) => {
  await page.goto('/#/r/not-a-real-token-123456');
  await expect(page.getByText(/not valid|no studio server/)).toBeVisible();
});
