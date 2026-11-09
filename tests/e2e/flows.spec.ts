import { test, expect, type Page } from '@playwright/test';

const fixture = (f: string) => `tests/fixtures/${f}`;
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 800;

test('landing: the four moments play behind the glass and open the same project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your work stays in front');
  await page.getByRole('tab', { name: /Review/ }).click();
  if (!isPhone(page)) await expect(page.getByText('Shadow side could go one stop deeper').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open the demo project' }).first().click();
  await expect(page).toHaveURL(/#\/p\/form-01/);
  await expect(page.getByRole('tab', { name: /Review/, selected: true })).toBeVisible();
});

test('designer: own project, upload, second version, note survives reload', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByPlaceholder('e.g. Halden — identity').fill('E2E project');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/#\/p\/p-.*s=collect/);

  // a wrong file explains itself
  await page.locator('button[aria-label="Add references"] + input[type=file]').setInputFiles(fixture('notes.txt'));
  await expect(page.getByText(/only images/)).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).first().click();

  // Make: a new work, then v2 on top of it
  await page.keyboard.press('2');
  await page.locator('button[aria-label="Add new work"] + input[type=file]').setInputFiles(fixture('v1.png'));
  await expect(page).toHaveURL(/i=w-/);
  if (isPhone(page)) await page.getByRole('button', { name: 'Details' }).click();
  await page.locator('button[aria-label="Upload a new version"] + input[type=file]').setInputFiles(fixture('v2.png'));
  await expect(page).toHaveURL(/cmp=/);

  // pin a note: C, then click the work
  if (isPhone(page)) {
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('complementary', { name: 'Details' })).toBeHidden();
  }
  await page.keyboard.press('c');
  const box = (await page.locator('[style*="crosshair"]').first().boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.3);
  await page.getByRole('textbox', { name: 'New note on this spot' }).fill('Pull the terracotta back 10%.');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('Pull the terracotta back 10%.').first()).toBeVisible();

  // the work now waits in Review, and the note survives a reload
  await page.reload();
  await expect(page.getByRole('tab', { name: /Review/, selected: true })).toBeVisible();
  await expect(page.getByText('Pull the terracotta back 10%.').first()).toBeVisible();
});

test('art director: open a waiting note, resolve and reopen, timecoded note, present', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByRole('button', { name: /Shadow side could go one stop deeper/ }).click();
  await expect(page).toHaveURL(/c=c-shadow/);
  if (isPhone(page)) await expect(page.getByRole('complementary', { name: 'Details' })).toBeVisible();
  await page.getByRole('button', { name: 'Resolve' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await page.goto('/#/p/form-01?i=turntable&c=c-speed');
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
  await expect(page.getByText('הפרויקטים שלך')).toBeVisible();
  await page.goto('/#/p/form-01?i=hero-render&v=hero-v2&cmp=hero-v1');
  await expect(page.locator('[dir="ltr"]').first()).toBeVisible();
});

test('a bad review link explains itself', async ({ page }) => {
  await page.goto('/#/r/not-a-real-token-123456');
  await expect(page.getByText(/not valid|no studio server/)).toBeVisible();
});
