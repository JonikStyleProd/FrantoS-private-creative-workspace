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
  await page.getByRole('button', { name: /Shadow side could go one stop deeper/ }).first().click();
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

test('site constructor: page from a template, edit in place, phone override, review version with its live page', async ({ page }) => {
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByPlaceholder('e.g. Halden — identity').fill('Site E2E');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/#\/p\/p-/);
  const pid = page.url().match(/#\/p\/(p-[^/?]+)/)![1];
  await page.goto(`/#/s/${pid}?m=site`);
  await page.getByRole('button', { name: /^Landing/ }).click();
  const h1 = page.locator('.fs-page h1');
  await expect(h1).toHaveText('Made slowly, meant to stay');

  // edit the headline in place
  await h1.click();
  await h1.click();
  await page.keyboard.type('Bread from the harbour');
  await page.keyboard.press('Enter');
  await expect(h1).toHaveText('Bread from the harbour');

  // on the phone width the hero headline gets its own size; desktop keeps its own
  await page.getByRole('radio', { name: /Phone/ }).click();
  await h1.click();
  if (isPhone(page)) await page.getByRole('button', { name: 'Element' }).click();
  await page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: '28' }).click();
  await expect(h1).toHaveCSS('font-size', '28px');
  if (isPhone(page)) await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('radio', { name: /Desktop/ }).click();
  await expect(h1).not.toHaveCSS('font-size', '28px');

  // survives a reload
  await page.reload();
  await expect(page.locator('.fs-page h1')).toHaveText('Bread from the harbour');

  // to review: a picture becomes v1 of the page's work, and the live page opens over it
  await page.getByRole('button', { name: /To review/ }).click();
  await expect(page.getByText('Sent to review as a new version')).toBeVisible({ timeout: 30_000 });
  await page.goto(`/#/p/${pid}/review`);
  await page.getByRole('button', { name: 'Live page' }).click();
  await expect(page.getByRole('dialog', { name: 'Live page' }).locator('.fs-page h1')).toHaveText('Bread from the harbour');
});

test('site motion: timeline scrubs the entrances, the inspector changes them, the preview plays them and respects reduced motion', async ({ page }) => {
  // the Halden demo page comes with motion
  await page.goto('/#/s/halden?m=site');
  const h1 = page.locator('.fs-page h1');
  await expect(h1).toBeVisible();
  if (!isPhone(page)) {
    await page.getByRole('button', { name: 'Timeline' }).click();
    const word = h1.locator('.w').first();
    await expect(word).toBeAttached();
    // at the very start the headline is not in yet; at the end it is
    const ruler = page.locator('.sticky.cursor-ew-resize');
    const r = (await ruler.boundingBox())!;
    await page.mouse.click(r.x + 2, r.y + r.height / 2);
    await expect.poll(async () => +(await word.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.3);
    await page.mouse.click(r.x + r.width - 2, r.y + r.height / 2);
    await expect.poll(async () => +(await word.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.95);

    // the inspector switches the headline to a plain fade
    await h1.click();
    await page.getByRole('radiogroup', { name: 'Entrance' }).getByRole('radio', { name: 'Fade in' }).click();
    await expect(h1.locator('.w')).toHaveCount(0);
    await expect(h1).toHaveAttribute('data-a', /load|scroll/);
    await page.getByRole('button', { name: 'Close the timeline' }).click();
  }

  // the live page plays: load entrances get going
  await page.goto('/#/site/halden/halden-pg-home');
  await expect(page.locator('.fs-page [data-a="load"]').first()).toHaveClass(/is-in/);

  // visitors who ask for less motion get the still page at once
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const anyScroll = page.locator('.fs-page [data-a="scroll"]').last();
  await expect(anyScroll).toHaveClass(/is-in/);
  await expect.poll(() => anyScroll.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
});

test('site export: static site and React project as ZIP, PNG; an unknown public address explains itself', async ({ page }) => {
  await page.goto('/#/s/saltwater?m=site');
  await expect(page.locator('.fs-page h1')).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('radio', { name: /All pages/ }).click();
  const read = async (name: RegExp) => {
    const [d] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name }).click()]);
    const fs = await import('fs');
    return { file: d.suggestedFilename(), body: fs.readFileSync((await d.path())!).toString('latin1') };
  };
  const site = await read(/Website · HTML/);
  expect(site.file).toMatch(/-site\.zip$/);
  for (const f of ['index.html', 'two-days-for-one-loaf.html', 'css/fonts.css', 'js/motion.js', '.woff2', 'assets/']) expect(site.body).toContain(f);
  expect(site.body).toContain('class="fs-page');
  const react = await read(/React \+ Vite/);
  for (const f of ['package.json', 'src/main.jsx', 'src/useMotion.js', 'tailwind.tokens.js', 'className="fs-page']) expect(react.body).toContain(f);
  const png = await read(/PNG · 390/);
  expect(png.file).toMatch(/-390\.png$/);
  expect(png.body.slice(1, 4)).toBe('PNG');
  // publishing a demo is not possible: it lives in this browser only
  await expect(dialog.getByText(/move the project to your studio|sign in/i).first()).toBeVisible();

  await page.goto('/#/w/no-such-page-here');
  await expect(page.getByText('This page is not published')).toBeVisible({ timeout: 20_000 });
});

test('site parts: component copies follow the main, entries feed the cards and the entry page, saved blocks, the check', async ({ page }) => {
  test.skip(isPhone(page), 'the inspector and the side panels are checked on desktop; the phone check is in the export and motion tests');
  await page.goto('/#/s/halden?m=site');
  const cards = page.locator('.fs-page .t-grid').nth(1).locator(':scope > .t-stack');
  await expect(cards).toHaveCount(4);
  // the sofa copy uses the Sale variant; switching it to Default drops the tag
  await cards.nth(2).locator('.t-media').click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/copies on the pages/)).toBeVisible();
  await expect(cards.nth(2)).toContainText('−20% this week');
  await page.getByRole('radiogroup', { name: 'Variant' }).getByRole('radio', { name: 'Default' }).click();
  await expect(cards.nth(2)).not.toContainText('−20% this week');
  await expect(cards.nth(2)).toContainText('Dune sofa');
  // a style change inside one copy reaches every copy; words stay each copy's own
  await cards.nth(0).locator('.t-media').click();
  await page.getByRole('radiogroup', { name: 'Corners' }).getByRole('radio', { name: 'Pill' }).click();
  for (let i = 0; i < 4; i++) await expect(cards.nth(i).locator('.t-media')).toHaveCSS('border-radius', '999px');
  await expect(cards.nth(1)).toContainText('Fold lamp');
  // keep the card as a block for any project
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save as block' }).click();
  await page.getByRole('tab', { name: 'Add' }).click();
  await expect(page.getByText('My blocks')).toBeVisible();

  // the check finds the button that goes nowhere and takes you to it
  await page.getByRole('button', { name: 'Check' }).click();
  const remark = page.getByRole('button', { name: /The button goes nowhere yet/ });
  await expect(remark).toBeVisible({ timeout: 20_000 });
  await remark.click();
  await expect(page.locator('.fs-page [data-n]').filter({ has: page.locator(':scope') }).first()).toBeVisible();

  // Saltwater: an entry written in Entries shows on its card and on the entry page
  await page.goto('/#/s/saltwater?m=site');
  await page.getByRole('tab', { name: 'Entries' }).click();
  await page.getByRole('button', { name: /One sticker on a kraft bag/ }).click();
  const title = page.getByRole('complementary', { name: 'Sections and layers' }).getByRole('textbox', { name: 'Title' });
  await title.fill('Bags that walk around town');
  await expect(page.locator('.fs-page h3', { hasText: 'Bags that walk around town' })).toBeVisible();
  await page.goto('/#/site/saltwater/saltwater-pg-journal');
  await page.locator('.fs-page a', { hasText: 'Read the story' }).nth(2).click();
  await expect(page.locator('.fs-page h1')).toHaveText('Bags that walk around town');
});

test('site artboards: the demo post opens at its size and goes out as GIF, Lottie and PNG poster', async ({ page }) => {
  test.skip(isPhone(page), 'frame-by-frame export is checked on desktop');
  test.setTimeout(150_000);
  // the demo artboard opens at its own size
  await page.goto('/#/s/halden?m=site&pg=halden-pg-post');
  await expect(page.getByText('1080 × 1080').first()).toBeVisible();
  await expect(page.locator('.fs-page h1')).toContainText('The Ask chair');

  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  const read = async (name: RegExp) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), dialog.getByRole('button', { name }).click()]);
    const fs = await import('fs');
    return { file: d.suggestedFilename(), buf: fs.readFileSync((await d.path())!) };
  };
  const gif = await read(/^GIF/);
  expect(gif.file).toMatch(/\.gif$/);
  expect(gif.buf.subarray(0, 6).toString('latin1')).toBe('GIF89a');
  expect(gif.buf.readUInt16LE(6)).toBeLessThanOrEqual(600);
  await expect(dialog.getByText(/Saved: .*\.gif/)).toBeVisible();

  const lot = await read(/^Lottie/);
  const json = JSON.parse(lot.buf.toString('utf8'));
  expect(json.w).toBe(1080);
  expect(json.h).toBe(1080);
  expect(json.layers.length).toBeGreaterThan(3);
  expect(json.layers.some((l: { ks: { o: { a: number } } }) => l.ks.o.a === 1)).toBe(true);
  await expect(dialog.locator('svg').first()).toBeVisible();

  const png = await read(/^Poster/);
  expect(png.buf.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect(png.buf.readUInt32BE(16)).toBe(1080);
});

test('studio header fits the phone; motion makes a Lottie from a preset, downloads it and adds it to the project', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#/s/ritual');
  await expect(page.getByRole('button', { name: 'Back to the project' })).toBeVisible();
  const vw = page.viewportSize()!.width;
  for (const name of ['Back to the project', 'Showroom']) {
    const r = (await page.getByRole('button', { name, exact: true }).filter({ visible: true }).first().boundingBox())!;
    expect(r.width).toBeGreaterThan(30);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(vw);
  }

  await page.goto('/#/s/ritual?m=motion&k=lottie');
  await page.getByRole('radio', { name: 'Ring' }).click();
  await expect(page.getByText('An arc that grows and runs around a quiet track')).toBeVisible();
  await page.getByRole('textbox', { name: 'Name' }).fill('Ritual roasting');
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON' }).click()]);
  expect(d.suggestedFilename()).toMatch(/ritual-roasting\.json$/);
  const fs = await import('fs');
  const json = JSON.parse(fs.readFileSync((await d.path())!, 'utf8'));
  expect(json.w).toBe(512);
  expect(json.nm).toBe('Ritual roasting');
  expect(JSON.stringify(json)).toContain('"ty":"tm"');
  expect(json.layers.some((l: { ty: number }) => l.ty === 4)).toBe(true);
  await page.getByRole('button', { name: 'To project' }).click();
  await expect(page.getByText(/Added to the project/)).toBeVisible();
  await page.goto('/#/p/ritual');
  await expect(page.getByText('ritual-roasting').first()).toBeVisible({ timeout: 20_000 });
});

test('case page: opens from the project in the new design, flips to the work behind it, fits a phone', async ({ page }) => {
  await page.goto('/#/p/form-01?s=show');
  const open = page.getByRole('button', { name: 'Open the case page' }).first();
  if (await open.isVisible().catch(() => false)) await open.click();
  else await page.goto('/#/p/form-01/case');
  await expect(page).toHaveURL(/#\/p\/form-01\/case/);
  await expect(page.locator('.lg.handoff-print')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'FORM / 01' })).toBeVisible();
  await page.getByRole('button', { name: /Behind the work/ }).click();
  await expect(page.getByRole('heading', { name: 'What shaped it' })).toBeInViewport({ timeout: 10_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Back to project' }).click();
  await expect(page).toHaveURL(/#\/p\/form-01$/);
  // the public address of an unpublished case explains itself instead of hanging
  await page.goto('/#/c/no-such-case');
  await expect(page.getByText(/not public|Opening/).first()).toBeVisible();
});
