import { test, expect, type Page } from '@playwright/test';

/**
 * Visual guard: key screens in three languages.
 *  1. Nothing spills past the screen and no button's label is cut — the bug that kept coming back.
 *  2. Screenshots of the screens whose content does not move with the clock, compared with the stored ones.
 * Update the stored pictures after an intended change: npx playwright test visual --update-snapshots
 */
const LANGS = ['en', 'ru', 'he'] as const;
const AUDIT = ['/#/s/halden?m=site', '/#/site/saltwater/saltwater-pg-journal?w=sm', '/#/app', '/#/library', '/#/settings', '/#/templates', '/#/plan', '/#/p/wavelength/handoff', '/#/p/velo/decisions', '/#/p/form-01', '/#/p/form-01/case', '/#/p/ritual/guide', '/#/r/not-a-real-token-123456', '/#/s/ritual?m=motion&k=lottie', '/#/'];
const SHOTS = ['/#/templates', '/#/p/wavelength/handoff'];

async function open(page: Page, lang: string, path: string) {
  await page.goto('/');
  await page.evaluate((l) => {
    localStorage.setItem('frantos-lang', l);
    localStorage.setItem('frantos-theme', 'dark');
    localStorage.setItem('frantos-quality', 'lite');
    localStorage.setItem('frantos-kit-skip', '1');
    localStorage.setItem('frantos-tour-done', '1');
  }, lang);
  await page.goto(path);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
}

for (const lang of [...LANGS, 'ru-360'] as const) {
  test(`nothing spills or gets cut · ${lang}`, async ({ page }, info) => {
    // ru-360: the longest language on a small phone (360 px), where pills overflow first
    if (lang === 'ru-360') {
      test.skip(info.project.name !== 'phone', 'small phone only');
      await page.setViewportSize({ width: 360, height: 760 });
    }
    const width = page.viewportSize()!.width;
    const problems: string[] = [];
    for (const path of AUDIT) {
      await open(page, lang.slice(0, 2), path);
      const found = await page.evaluate((W) => {
        const out: string[] = [];
        const scrolls = (e: Element) => !!e.closest('.lg-scroll, [class*="overflow-x-auto"], [class*="overflow-auto"], .columns-2');
        for (const e of document.querySelectorAll('button, a, h1, h2, h3, p, label, input, select')) {
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden' || scrolls(e)) continue;
          // nor past the glass panel it sits in (a button poking out of its pill)
          const box = e.parentElement?.closest('.lg-glass, .lg-glass-strong');
          if (box && (e.tagName === 'BUTTON' || e.tagName === 'A') && !e.closest('[class*="overflow-x-auto"], .lg-scroll')) {
            const b = box.getBoundingClientRect();
            if (r.right > b.right + 1 || r.left < b.left - 1) out.push(`${e.tagName} "${((e as HTMLElement).innerText || e.getAttribute('aria-label') || '').slice(0, 40)}" pokes out of its panel`);
          }
          if (r.right > W + 1 || r.left < -1) out.push(`${e.tagName} "${((e as HTMLElement).innerText || e.getAttribute('aria-label') || '').slice(0, 40)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
          const el = e as HTMLElement;
          if (e.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'visible' && el.innerText.trim()) out.push(`BUTTON text wider than the button: "${el.innerText.slice(0, 40)}"`);
        }
        return out.slice(0, 6);
      }, width);
      found.forEach((f) => problems.push(`${path}: ${f}`));
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  for (const path of lang === 'ru-360' ? [] : SHOTS) {
    test(`looks the same · ${lang} · ${path}`, async ({ page }) => {
      await open(page, lang, path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${lang}-${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.png`, {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
        // dates and the sync dot move with the clock
        mask: [page.locator('time'), page.locator('[title="synced"], [title="syncing"]')],
      });
    });
  }
}
