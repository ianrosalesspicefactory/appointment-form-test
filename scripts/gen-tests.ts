#!/usr/bin/env node
/**
 * Scaffolds test stubs from a Jira ticket's AC checklist.
 *
 * Usage:
 *   npx tsx scripts/gen-tests.ts --ticket AGA-900
 *   npx tsx scripts/gen-tests.ts --ticket AGA-900 --dry-run   # preview only
 *
 * Required env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 *
 * For each AC item the script:
 *   1. Classifies it into one of: DOM, NETWORK, FORM, E2E, BEHAVIOR
 *   2. Picks the right test template
 *   3. Writes a failing stub test so you start red and implement to green
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { getChecklist } from './jira-reporter.js';

config({ path: path.resolve(process.cwd(), '.env') });

// ─── CLI args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function getArg(flag: string) {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

const ticket = getArg('--ticket');
const dryRun = argv.includes('--dry-run');

if (!ticket) {
  console.error('Usage: npx tsx scripts/gen-tests.ts --ticket <TICKET> [--dry-run]');
  process.exit(1);
}

// ─── AC classification ────────────────────────────────────────────────────────

type TestKind = 'DOM' | 'NETWORK' | 'FORM' | 'E2E' | 'BEHAVIOR';

interface Classification {
  kind: TestKind;
  description: string;
}

const KIND_PATTERNS: Array<{ kind: TestKind; pattern: RegExp }> = [
  {
    kind: 'NETWORK',
    pattern: /api|fetch|endpoint|request|response|http|load.*data|data.*load/i,
  },
  {
    kind: 'FORM',
    pattern: /submit|form|input|fill|type|select|required|valid|invalid|error message/i,
  },
  {
    kind: 'E2E',
    pattern: /navigate|redirect|flow|end.?to.?end|click.*button|button.*click|page/i,
  },
  {
    kind: 'DOM',
    pattern: /render|display|show|visible|appear|label|button|text|ui/i,
  },
];

function classify(acText: string): Classification {
  const clean = acText.replace(/^\s*[\[\(]?[xX✓✔]?[\]\)]?\s*/, '').trim();
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (pattern.test(clean)) return { kind, description: clean };
  }
  return { kind: 'BEHAVIOR', description: clean };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeForTemplate(text: string): string {
  return text.replace(/'/g, "\\'");
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ─── Template builders ────────────────────────────────────────────────────────

function domTestTemplate(ticket: string, acItem: string, description: string): string {
  const desc = escapeForTemplate(description);
  return `/**
 * ${ticket} — DOM test
 * AC: ${acItem}
 */

const { JSDOM } = require('jsdom');

describe('${desc}', () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
    document = dom.window.document;
  });

  it('TODO: fill in the expected DOM state', () => {
    // Arrange — set up the DOM

    // Act — trigger the behaviour

    // Assert
    // expect(document.querySelector('...')).toBeTruthy();
    throw new Error('RED — implement this test');
  });
});
`;
}

function networkTestTemplate(ticket: string, acItem: string, description: string): string {
  const desc = escapeForTemplate(description);
  return `/**
 * ${ticket} — Network / fetch test
 * AC: ${acItem}
 */

// Stub global fetch before each test
describe('${desc}', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('TODO: fill in the expected fetch behaviour', async () => {
    // Arrange — stub the network call
    global.fetch = async (url) => ({
      ok: true,
      json: async () => ({ /* mock response */ }),
    });

    // Act
    // const result = await yourFunction();

    // Assert
    // expect(result).toEqual({ ... });
    throw new Error('RED — implement this test');
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });

    // Act + Assert
    throw new Error('RED — implement this test');
  });
});
`;
}

function formTestTemplate(ticket: string, acItem: string, description: string): string {
  const desc = escapeForTemplate(description);
  return `/**
 * ${ticket} — Form test
 * AC: ${acItem}
 */

const { JSDOM } = require('jsdom');

describe('${desc}', () => {
  let document, window;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
    });
    document = dom.window.document;
    window = dom.window;
  });

  it('TODO: fill in the form validation / submission test', async () => {
    // Arrange — build the form in DOM
    // const form = document.createElement('form');
    // const input = document.createElement('input');
    // input.type = 'text';
    // form.appendChild(input);
    // document.body.appendChild(form);

    // Act — simulate user input and submit

    // Assert
    throw new Error('RED — implement this test');
  });
});
`;
}

function e2eTestTemplate(ticket: string, acItem: string, description: string): string {
  const desc = escapeForTemplate(description);
  return `/**
 * ${ticket} — E2E test (Playwright)
 * AC: ${acItem}
 */
import { test, expect } from '@playwright/test';

test.describe('${desc}', () => {
  test('TODO: fill in the full-flow scenario', async ({ page }) => {
    await page.goto('/');

    // TODO: implement the scenario steps
    // await page.click('...');
    // await page.fill('...', '...');
    // await expect(page.locator('...')).toBeVisible();

    expect(false).toBe(true); // RED — remove once implemented
  });
});
`;
}

function behaviorTestTemplate(ticket: string, acItem: string, description: string): string {
  const desc = escapeForTemplate(description);
  return `/**
 * ${ticket} — Behavior test
 * AC: ${acItem}
 */

describe('${desc}', () => {
  it('TODO: fill in the expected behavior', () => {
    // Arrange

    // Act

    // Assert
    throw new Error('RED — implement this test');
  });
});
`;
}

// ─── Output path logic ────────────────────────────────────────────────────────

function resolveOutputPath(ticket: string, kind: TestKind, slug: string): string {
  const ticketDir = ticket.toLowerCase().replace('-', '_');
  if (kind === 'E2E') {
    return path.join(process.cwd(), 'e2e', ticketDir, `${slug}.spec.ts`);
  }
  return path.join(process.cwd(), 'tests', ticketDir, `${slug}.test.js`);
}

// ─── File writer ──────────────────────────────────────────────────────────────

function writeFile(filePath: string, content: string): void {
  if (dryRun) {
    console.log(`  [dry-run] Would write: ${path.relative(process.cwd(), filePath)}`);
    console.log('  ' + '─'.repeat(60));
    console.log(content.split('\n').map(l => '  ' + l).join('\n'));
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (fs.existsSync(filePath)) {
    console.log(`  ⏭️  Skipped (already exists): ${path.relative(process.cwd(), filePath)}`);
    return;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅  Created: ${path.relative(process.cwd(), filePath)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪  gen:tests — ${ticket}${dryRun ? ' (dry-run)' : ''}\n`);

  const checklist = await getChecklist(ticket!);
  if (!checklist) {
    console.error(`❌  No checklist found on ${ticket}. Add AC items to the ticket first.`);
    process.exit(1);
  }

  console.log(`📋  ${checklist.total} AC items found:\n`);
  checklist.items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  console.log();

  const generated: string[] = [];

  for (const item of checklist.items) {
    const { kind, description } = classify(item);
    const slug = toSlug(description);
    const outPath = resolveOutputPath(ticket!, kind, slug);

    console.log(`📌  [${kind}] ${description.slice(0, 70)}`);

    let content: string;
    switch (kind) {
      case 'NETWORK':
        content = networkTestTemplate(ticket!, item, description);
        break;
      case 'FORM':
        content = formTestTemplate(ticket!, item, description);
        break;
      case 'E2E':
        content = e2eTestTemplate(ticket!, item, description);
        break;
      case 'DOM':
        content = domTestTemplate(ticket!, item, description);
        break;
      default:
        content = behaviorTestTemplate(ticket!, item, description);
    }

    writeFile(outPath, content);
    generated.push(outPath);
  }

  if (!dryRun) {
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  ${generated.length} test file(s) scaffolded for ${ticket}`);
    console.log('  Next steps:');
    console.log('    1. node --test tests/      → confirm all stubs are RED');
    console.log('    2. Implement the feature   → make tests go GREEN');
    console.log('    3. npm run ac:check        → report results to Jira');
    console.log('══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
