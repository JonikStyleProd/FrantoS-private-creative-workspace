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
  await page.locator('button[aria-label="Add references"] + input[type=file]').setInputFiles(fixture('archive.zip'));
  await expect(page.getByText(/cannot be added/)).toBeVisible();
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

test('studio: change the material, it survives a reload and shows in the showroom', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/#/s/form-01');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Preparing the object…')).toBeHidden({ timeout: 15000 });
  if (isPhone(page)) await page.getByRole('button', { name: 'Material' }).click();
  await page.getByRole('radio', { name: 'Raw clay' }).click();
  await expect(page.getByRole('radio', { name: 'Raw clay' })).toHaveAttribute('aria-checked', 'true');
  await page.waitForTimeout(3500); // the edit is saved after a short pause
  await page.reload();
  await expect(page.getByText('Preparing the object…')).toBeHidden({ timeout: 20000 });
  if (isPhone(page)) await page.getByRole('button', { name: 'Material' }).click();
  await expect(page.getByRole('radio', { name: 'Raw clay' })).toHaveAttribute('aria-checked', 'true', { timeout: 15000 });
  await page.goto('/#/o/form-01/o-vessel');
  await expect(page.getByRole('radio', { name: 'Raw clay', checked: true })).toBeVisible({ timeout: 20000 });
});

test('studio: import a GLB, render it into the project as a new work', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(isPhone(page), 'desktop flow');
  await page.goto('/#/s/form-01');
  await expect(page.getByText('Preparing the object…')).toBeHidden({ timeout: 15000 });
  await page.locator('button[aria-label="Import GLB"] + input[type=file]').setInputFiles(fixture('pyramid.glb'));
  await expect(page.getByText('Model imported')).toBeVisible();
  await expect(page.getByRole('button', { name: 'pyramid GLB model' })).toBeVisible();
  await expect(page.getByText('Preparing the object…')).toBeHidden({ timeout: 15000 });
  await page.getByRole('button', { name: 'To project', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/form-01\?s=make&i=w-/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /pyramid/ })).toBeVisible({ timeout: 15000 });
});

test('studio modes: canvas board exports to the project, image edit saves a new version, motion has keys', async ({ page }) => {
  test.setTimeout(150_000);
  test.skip(isPhone(page), 'desktop flow');
  // Canvas: a composed board from one click, then into the project
  await page.goto('/#/s/form-01?m=canvas');
  await page.getByRole('button', { name: 'Post 4:5' }).click();
  await expect(page.getByText('1080 × 1350 px', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'To project', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/form-01\?s=make&i=w-/, { timeout: 20000 });
  // Image: a look and a crop, saved as a new version of the poster
  await page.goto('/#/s/form-01?m=image&a=poster');
  await page.getByRole('button', { name: 'Warm film' }).click();
  await page.getByRole('radio', { name: '1:1' }).click();
  await page.getByRole('button', { name: 'Save as new version' }).click();
  await expect(page.getByText(/Saved as a new version/)).toBeVisible({ timeout: 20000 });
  // Motion: three keys out of the box, play toggles
  await page.goto('/#/s/form-01?m=motion');
  await expect(page.getByRole('button', { name: /^Key at/ })).toHaveCount(3, { timeout: 20000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  // ⌘K lists the studio's own commands
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('option', { name: /Studio: Canvas/ })).toBeVisible();
});

test('workspace pages: library, objects, templates, settings, portfolio, news, deck, guide', async ({ page }) => {
  test.setTimeout(150_000);
  test.skip(isPhone(page), 'desktop flow');
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: /files across/ })).toBeVisible();
  await page.goto('/#/objects');
  await expect(page.getByRole('heading', { name: 'The shelf' })).toBeVisible();
  await expect(page.getByText('Vessel · 225° twist').first()).toBeVisible();
  // a template makes a project with boards and opens it in Canvas
  await page.goto('/#/templates');
  await page.getByRole('button', { name: 'Use this template' }).first().click();
  await expect(page).toHaveURL(/#\/s\/p-.*m=canvas/, { timeout: 15000 });
  await expect(page.getByText(/× \d+ px/)).toBeVisible();
  // the brand kit: a heading face chosen in Settings
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /Literata/ }).first().click();
  await expect(page.getByRole('button', { name: /Literata/ }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/portfolio');
  await expect(page.getByRole('heading', { name: 'Your work, on one page' })).toBeVisible();
  await page.goto('/#/new');
  await expect(page.getByRole('heading', { name: 'Fresh in FrantoS' })).toBeVisible();
  // a board presented, then the brand guide
  await page.goto('/#/s/form-01?m=canvas');
  await page.getByRole('button', { name: 'Post 4:5' }).first().click();
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page).toHaveURL(/#\/p\/form-01\/deck/);
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeVisible();
  await page.goto('/#/p/form-01/guide');
  await expect(page.getByRole('heading', { name: 'FORM / 01' })).toBeVisible();
});
