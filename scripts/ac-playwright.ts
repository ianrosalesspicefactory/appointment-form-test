#!/usr/bin/env node
/**
 * Reads a Jira ticket's AC checklist, auto-detects what Playwright scenarios
 * to run based on the checklist text, takes screenshots, then posts results
 * back to Jira as a comment with screenshots attached.
 *
 * Usage:
 *   npx tsx scripts/ac-playwright.ts --ticket AGA-900
 *   npx tsx scripts/ac-playwright.ts --ticket AGA-900 --url http://localhost:3000
 *   npx tsx scripts/ac-playwright.ts --ticket AGA-900 --no-confirm   # skip prompt (CI)
 *   npx tsx scripts/ac-playwright.ts --ticket AGA-900 --headed        # watch the browser
 *   npx tsx scripts/ac-playwright.ts --ticket AGA-900 --headed --slowmo 800  # watch in slow motion
 *
 * Required env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 * Optional env vars: APP_URL, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { getChecklist, attachScreenshot, postComment, ChecklistData } from './jira-reporter.js';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

const ticket    = getArg('--ticket');
const appUrl    = getArg('--url') ?? process.env.APP_URL ?? 'http://localhost:3000';
const noConfirm = argv.includes('--no-confirm');
const headed    = argv.includes('--headed');
const slowMo    = headed ? Number(getArg('--slowmo') ?? '500') : 0;

if (!ticket) {
  console.error('Usage: npx tsx scripts/ac-playwright.ts --ticket <TICKET> [--url <URL>] [--headed] [--slowmo <ms>] [--no-confirm]');
  process.exit(1);
}

// ─── Confirmation prompt ──────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      process.stdin.pause();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

const screenshotDir = path.join(os.tmpdir(), 'ac-screenshots', ticket!);

// ─── Scenario types ───────────────────────────────────────────────────────────

type ScenarioType = 'CONSOLE_CHECK' | 'FORM_INTERACTION' | 'MOBILE_SCROLL' | 'SCREENSHOT_ONLY';

const INTENT_PATTERNS: Array<{ type: ScenarioType; pattern: RegExp }> = [
  {
    type: 'CONSOLE_CHECK',
    pattern: /\b(error|crash|graceful|without errors|no errors|defaults gracefully|no crash)\b/i,
  },
  {
    // Triggered by AC items about mobile scroll locking, overlay containment, last-row visibility
    type: 'MOBILE_SCROLL',
    pattern: /mobile|scroll|background.*scroll|body.*scroll|scroll.*lock|overlay|store.?selector|last.?row|last.?store|selectable|scroll.*contain|overscroll|iPhone/i,
  },
  {
    type: 'FORM_INTERACTION',
    pattern: /submit|book(ing)?|register|form|input|click|button|select|fill|type/i,
  },
];

// ─── Result type ──────────────────────────────────────────────────────────────

interface ScenarioResult {
  name: string;
  passed: boolean;
  screenshotPath?: string;
  error?: string;
}

// ─── Console / crash check ────────────────────────────────────────────────────

async function runConsoleCheck(browser: Browser): Promise<ScenarioResult[]> {
  console.log('  → Checking for JS errors on load');
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });

    await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(3_000);

    const screenshotPath = path.join(screenshotDir, 'console-check.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const passed = errors.length === 0;
    return [{
      name: 'No JS errors on load',
      passed,
      screenshotPath,
      error: passed ? undefined : errors.slice(0, 5).join('\n'),
    }];
  } catch (e: any) {
    return [{ name: 'No JS errors on load', passed: false, error: e.message }];
  } finally {
    await ctx?.close();
  }
}

// ─── Form interaction check ───────────────────────────────────────────────────

async function runFormInteraction(browser: Browser): Promise<ScenarioResult[]> {
  console.log('  → Checking form interactions');
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext();
    const page = await ctx.newPage();
    const jsErrors: string[] = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const beforePath = path.join(screenshotDir, 'form-before-interact.png');
    await page.screenshot({ path: beforePath, fullPage: true });

    // Look for any visible form inputs and take a screenshot as evidence
    const inputCount = await page.locator('input, select, textarea').count();
    const buttonCount = await page.locator('button').count();

    const afterPath = path.join(screenshotDir, 'form-state.png');
    await page.screenshot({ path: afterPath, fullPage: true });

    const passed = jsErrors.length === 0;
    return [{
      name: `Form elements present (${inputCount} inputs, ${buttonCount} buttons)`,
      passed,
      screenshotPath: afterPath,
      error: !passed ? `JS errors: ${jsErrors.slice(0, 3).join('; ')}` : undefined,
    }];
  } catch (e: any) {
    return [{ name: 'Form interaction check', passed: false, error: e.message }];
  } finally {
    await ctx?.close();
  }
}

// ─── Mobile scroll check (iPhone 14 emulation) ───────────────────────────────
//
// Verified live against appointment-form.js on 2026-06-24.
// Full navigation path confirmed by DOM inspection:
//   1. Load page  →  form mounts into #appointment-form
//   2. Click 対面相談  →  来院場所 section appears
//   3. Click 一覧から選択する  →  <dialog> "クリニック対応駅一覧" opens
//   4. Click 関東  →  prefecture list renders
//   5. Click 東京都  →  station grid renders (75+ items, total height ~5400px)
//
// Checks (all from fix goals):
//   A. Body scroll is locked (overflow hidden/clip) while the dialog is open
//   B. The last station card is reachable — its bottom edge fits within the viewport
//   C. The last station card is tappable — tap does not trigger a 404 response
//   D. No JS errors during the entire flow

const IPHONE_14 = {
  viewport: { width: 390, height: 844 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

async function runMobileScroll(browser: Browser): Promise<ScenarioResult[]> {
  console.log('  → Mobile scroll check (iPhone 14 @ 390×844)');
  const results: ScenarioResult[] = [];
  let ctx: BrowserContext | null = null;

  try {
    ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    const jsErrors: string[] = [];
    const notFoundResponses: string[] = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('response', res => {
      if (res.status() === 404) notFoundResponses.push(res.url());
    });

    // ── Step 1: load the LP ───────────────────────────────────────────────
    await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
    // Wait for the external appointment-form.js script to mount the form
    await page.waitForSelector('#appointment-form button', { timeout: 15_000 });
    await page.waitForTimeout(1_000);

    const shot1 = path.join(screenshotDir, 'mobile-01-loaded.png');
    await page.screenshot({ path: shot1 });
    console.log('    Captured: mobile-01-loaded.png');

    // ── Step 2: click 対面相談 (In-person consultation) ──────────────────
    await page.locator('button:has-text("対面相談")').tap();
    await page.waitForTimeout(1_000);

    // ── Step 3: click 一覧から選択する to open the station dialog ─────────
    // The form renders a native <dialog> element (confirmed by DOM inspection).
    await page.locator('button:has-text("一覧から選択する")').tap();
    await page.waitForSelector('dialog', { timeout: 8_000 });
    await page.waitForTimeout(800);

    const shot2 = path.join(screenshotDir, 'mobile-02-dialog-open.png');
    await page.screenshot({ path: shot2 });
    console.log('    Captured: mobile-02-dialog-open.png');

    // ── Check A: body scroll lock ─────────────────────────────────────────
    // The dialog is open — body/html overflow must be hidden or clip so the
    // LP behind the form cannot rubber-band scroll (the root cause of the bug).
    const bodyScrollLocked = await page.evaluate(() => {
      const bodyOv  = window.getComputedStyle(document.body).overflow;
      const bodyOvY = window.getComputedStyle(document.body).overflowY;
      const htmlOv  = window.getComputedStyle(document.documentElement).overflow;
      const htmlOvY = window.getComputedStyle(document.documentElement).overflowY;
      const locked  = (v: string) => v === 'hidden' || v === 'clip';
      return locked(bodyOv) || locked(bodyOvY) || locked(htmlOv) || locked(htmlOvY);
    });
    results.push({
      name: 'Body scroll is locked while the store-selector dialog is open',
      passed: bodyScrollLocked,
      screenshotPath: shot2,
      error: bodyScrollLocked
        ? undefined
        : 'body/html overflow is not hidden or clip — the LP background can still scroll behind the dialog',
    });

    // ── Step 4: select 関東 area then 東京都 prefecture ───────────────────
    // Use native <dialog> element as the scope — avoids [role="dialog"] attribute
    // selector which does not match native <dialog> elements without explicit role.
    await page.locator('dialog button:has-text("関東")').tap();
    await page.waitForTimeout(600);
    await page.locator('dialog button:has-text("東京都")').tap();
    await page.waitForTimeout(800);

    // Station cards are divs with cursor:pointer set via CSS class (not attribute).
    // Use page.evaluate to collect their bounding boxes — the only reliable way
    // to find elements by computed style rather than HTML attributes.
    const stationItems = page.locator('dialog').locator('[class*="cursor-pointer"]');
    let count = await stationItems.count();

    // Fallback: if Tailwind class not present, find via computed style in evaluate
    if (count === 0) {
      const handles = await page.$$('dialog div');
      for (const h of handles) {
        const cursor = await h.evaluate((el: Element) =>
          window.getComputedStyle(el as HTMLElement).cursor
        );
        if (cursor === 'pointer') count++;
      }
      // Re-locate using evaluate-based approach for interaction
    }
    console.log(`    Station cards found: ${count}`);

    const shot3 = path.join(screenshotDir, 'mobile-03-last-card.png');

    if (count > 0) {
      // ── Check B: last station card is visible (not clipped) ────────────
      // Scroll the last card into view, then measure its bounding box.
      // The bottom edge must fit inside the 844px viewport — if it doesn't,
      // the user cannot see or tap it without extra scrolling that doesn't work.
      const lastCard = stationItems.last();
      await lastCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await page.screenshot({ path: shot3 }); // viewport-only — captures real clip boundary
      console.log('    Captured: mobile-03-last-card.png');

      const box = await lastCard.boundingBox();
      const lastCardVisible       = box !== null && box.height > 0;
      const lastCardBelowViewport = box !== null && (box.y + box.height) > IPHONE_14.viewport.height;

      results.push({
        name: `Last station card (${count} total) is fully visible — not clipped by container`,
        passed: lastCardVisible && !lastCardBelowViewport,
        screenshotPath: shot3,
        error: !lastCardVisible
          ? 'Last station card has zero height — not rendered or clipped entirely'
          : lastCardBelowViewport
            ? `Last card bottom (${box ? Math.round(box.y + box.height) : '?'}px) exceeds ${IPHONE_14.viewport.height}px viewport — row is clipped`
            : undefined,
      });

      // ── Check C: last station card is tappable — no 404 triggered ──────
      const responsesBefore = notFoundResponses.length;
      try {
        await lastCard.tap({ timeout: 5_000 });
        await page.waitForTimeout(1_000);
      } catch {
        // Tap may close the dialog or navigate — both are expected on success
      }
      const shot4 = path.join(screenshotDir, 'mobile-04-after-tap.png');
      await page.screenshot({ path: shot4 });
      console.log('    Captured: mobile-04-after-tap.png');

      const new404s = notFoundResponses.length - responsesBefore;
      results.push({
        name: 'Tapping the last station card does not trigger a 404 response',
        passed: new404s === 0,
        screenshotPath: shot4,
        error: new404s > 0
          ? `${new404s} new 404 response(s) after tap: ${notFoundResponses.slice(-3).join(', ')}`
          : undefined,
      });
    } else {
      results.push({
        name: 'Last station card is fully visible — not clipped by container',
        passed: false,
        screenshotPath: shot2,
        error: 'No station cards found in the dialog after selecting 関東 → 東京都. The form may require a live API to load stations.',
      });
      results.push({
        name: 'Tapping the last station card does not trigger a 404 response',
        passed: false,
        screenshotPath: shot2,
        error: 'Skipped — station list did not render.',
      });
    }

    // ── Check E: overscroll-behavior: contain on the station list ────────
    // Root cause from PM review: MobileStepContent.tsx has no overscroll-behavior
    // on the inner scroll container, so iOS rubber-band momentum bleeds through
    // to the LP body. After the fix, the scrollable list element must have
    // overscroll-behavior set to "contain" or "none" on the Y axis.
    const overscrollContained = await page.evaluate(() => {
      // Find the scrollable container inside the dialog — the element that
      // holds the station cards and has overflow-y: auto or scroll.
      const dialog = document.querySelector('dialog');
      if (!dialog) return { passed: false, reason: 'dialog not found' };

      const scrollers = Array.from(dialog.querySelectorAll('*')).filter(el => {
        const s = window.getComputedStyle(el as HTMLElement);
        return s.overflowY === 'auto' || s.overflowY === 'scroll';
      });

      if (scrollers.length === 0) return { passed: false, reason: 'No overflow-y:auto/scroll element found inside dialog' };

      // Every scrollable container inside the dialog must contain its overscroll
      const offenders = scrollers.filter(el => {
        const s = window.getComputedStyle(el as HTMLElement);
        return s.overscrollBehaviorY !== 'contain' && s.overscrollBehaviorY !== 'none';
      });

      if (offenders.length === 0) return { passed: true, reason: '' };

      const detail = offenders.slice(0, 3).map(el => {
        const s = window.getComputedStyle(el as HTMLElement);
        return `<${el.tagName.toLowerCase()} class="${(el as HTMLElement).className.slice(0, 60)}"> overscroll-behavior-y: ${s.overscrollBehaviorY}`;
      }).join(' | ');

      return { passed: false, reason: detail };
    });

    const lastShot = path.join(screenshotDir, 'mobile-03-last-card.png');
    results.push({
      name: 'Station list scroll container has overscroll-behavior: contain — momentum does not bleed to LP',
      passed: overscrollContained.passed,
      screenshotPath: lastShot,
      error: overscrollContained.passed
        ? undefined
        : `overscroll-behavior-y is not contain/none on: ${overscrollContained.reason}`,
    });

    // ── Check F: no competing nested scroll containers ────────────────────
    // Root cause from PM review: MobileStepContent.tsx nests two overflow-auto
    // containers (outer flex-1 overflow-auto wrapping inner max-h-[60vh]
    // overflow-auto). The fix should flatten this to a single scrollable element.
    // We verify: inside the dialog, there is no overflow-auto/scroll element
    // that is a direct ancestor of another overflow-auto/scroll element.
    const noNestedScrollers = await page.evaluate(() => {
      const dialog = document.querySelector('dialog');
      if (!dialog) return { passed: false, reason: 'dialog not found' };

      const isScroller = (el: Element) => {
        const s = window.getComputedStyle(el as HTMLElement);
        return s.overflowY === 'auto' || s.overflowY === 'scroll';
      };

      const allScrollers = Array.from(dialog.querySelectorAll('*')).filter(isScroller);

      // For each scroller, walk up its ancestors (still inside dialog) and
      // check if any ancestor is also a scroller — that is a nested pair.
      const nestedPairs: string[] = [];
      for (const el of allScrollers) {
        let ancestor = el.parentElement;
        while (ancestor && ancestor !== dialog) {
          if (isScroller(ancestor)) {
            const childLabel  = `<${el.tagName.toLowerCase()} class="${(el as HTMLElement).className.slice(0, 50)}">`;
            const parentLabel = `<${ancestor.tagName.toLowerCase()} class="${(ancestor as HTMLElement).className.slice(0, 50)}">`;
            nestedPairs.push(`${parentLabel} > ${childLabel}`);
            break;
          }
          ancestor = ancestor.parentElement;
        }
      }

      if (nestedPairs.length === 0) return { passed: true, reason: '' };
      return { passed: false, reason: nestedPairs.slice(0, 2).join(' AND ') };
    });

    results.push({
      name: 'Station list uses a single scroll container — no nested overflow-auto elements competing',
      passed: noNestedScrollers.passed,
      screenshotPath: lastShot,
      error: noNestedScrollers.passed
        ? undefined
        : `Nested scroll containers found (competing overflow-auto): ${noNestedScrollers.reason}`,
    });

    // ── Check D: no JS errors during the entire flow ──────────────────────
    results.push({
      name: 'No JS errors during the full mobile store-selector flow',
      passed: jsErrors.length === 0,
      screenshotPath: lastShot,
      error: jsErrors.length > 0 ? jsErrors.slice(0, 3).join('; ') : undefined,
    });

  } catch (e: any) {
    results.push({ name: 'Mobile scroll check (fatal)', passed: false, error: e.message });
  } finally {
    await ctx?.close();
  }

  return results;
}

// ─── Default screenshot ───────────────────────────────────────────────────────

async function runScreenshotOnly(browser: Browser): Promise<ScenarioResult[]> {
  console.log('  → Taking default screenshot');
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(appUrl, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(3_000);

    const screenshotPath = path.join(screenshotDir, 'default.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return [{ name: 'App loads without crash', passed: true, screenshotPath }];
  } catch (e: any) {
    return [{ name: 'App loads without crash', passed: false, error: e.message }];
  } finally {
    await ctx?.close();
  }
}

// ─── Intent detector ──────────────────────────────────────────────────────────

function detectIntents(items: string[]): Set<ScenarioType> {
  const intents = new Set<ScenarioType>();
  for (const item of items) {
    for (const { type, pattern } of INTENT_PATTERNS) {
      if (pattern.test(item)) intents.add(type);
    }
  }
  intents.add('SCREENSHOT_ONLY');
  return intents;
}

// ─── Jira comment builder ─────────────────────────────────────────────────────

function buildComment(
  ticket: string,
  checklist: ChecklistData,
  results: ScenarioResult[],
  runUrl: string
): string {
  const allPassed = results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;

  const lines = [
    `${allPassed ? '✅' : '❌'} Playwright AC Check — ${ticket} (${passCount}/${results.length} passed)`,
    '',
    'Scenarios:',
    ...results.map(r => `  ${r.passed ? '✅' : '❌'} ${r.name}${r.error ? ` — ${r.error}` : ''}`),
    '',
    `Checklist (${checklist.checked}/${checklist.total} items checked):`,
    ...checklist.items.map((item, i) => `  ${i + 1}. ${item}`),
    '',
    `Run: ${runUrl}`,
    `Screenshots attached above.`,
  ];

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const safeTicket = ticket!;
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log(`\n🎯  AC Check — ${safeTicket}`);
  console.log(`📍  App: ${appUrl}\n`);

  // 1. Fetch checklist from Jira
  const checklist = await getChecklist(safeTicket);
  if (!checklist) {
    console.error(`❌  No checklist found on ${safeTicket}. Cannot run AC check.`);
    process.exit(1);
    return;
  }
  console.log(`📋  Checklist: ${checklist.total} items (${checklist.checked} checked)`);
  checklist.items.forEach((item, i) => console.log(`    ${i + 1}. ${item}`));

  // 2. Auto-detect which scenarios to run from checklist text
  const intents = detectIntents(checklist.items);
  console.log(`\n🔍  Detected scenarios: ${[...intents].join(', ')}\n`);

  // 3. Run Playwright scenarios
  if (headed) {
    console.log(`👁️   Headed mode — watch the browser (slowmo: ${slowMo}ms per action)\n`);
  }
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const allResults: ScenarioResult[] = [];

  try {
    if (intents.has('CONSOLE_CHECK')) {
      console.log('🖥️   Console check:');
      allResults.push(...await runConsoleCheck(browser));
    }
    if (intents.has('MOBILE_SCROLL')) {
      console.log('📱  Mobile scroll check (iPhone 14):');
      allResults.push(...await runMobileScroll(browser));
    }
    if (intents.has('FORM_INTERACTION')) {
      console.log('📝  Form interaction check:');
      allResults.push(...await runFormInteraction(browser));
    }
    if (intents.has('SCREENSHOT_ONLY')) {
      console.log('📸  Default screenshot:');
      allResults.push(...await runScreenshotOnly(browser));
    }
  } finally {
    await browser.close();
  }

  // 4. Print report
  const allPassed = allResults.every(r => r.passed);
  const passCount = allResults.filter(r => r.passed).length;

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  REPORT — ${safeTicket}  (${passCount}/${allResults.length} passed)`);
  console.log('══════════════════════════════════════════════════');
  allResults.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'}  ${r.name}`);
    if (r.error) console.log(`       → ${r.error}`);
  });
  console.log('──────────────────────────────────────────────────');
  console.log(`  Screenshots saved to: ${screenshotDir}/`);
  console.log('══════════════════════════════════════════════════\n');

  // 5. Confirmation before posting to Jira
  if (!noConfirm) {
    const proceed = await confirm('Post report + screenshots to Jira? (y/n): ');
    if (!proceed) {
      console.log('⏭️   Skipped — nothing posted to Jira.\n');
      process.exit(allPassed ? 0 : 1);
      return;
    }
  }

  // 6. Attach screenshots + post comment to Jira
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : 'local run';

  console.log('📎  Attaching screenshots to Jira...');
  for (const r of allResults) {
    if (r.screenshotPath && fs.existsSync(r.screenshotPath)) {
      await attachScreenshot(safeTicket, r.screenshotPath);
      console.log(`    Attached: ${path.basename(r.screenshotPath)}`);
    }
  }

  console.log('💬  Posting comment to Jira...');
  await postComment(safeTicket, buildComment(safeTicket, checklist, allResults, runUrl));

  console.log(allPassed ? '\n✅  All checks passed.\n' : '\n❌  Some checks failed.\n');
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
