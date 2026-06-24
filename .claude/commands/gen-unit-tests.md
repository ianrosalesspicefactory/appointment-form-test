---
description: Generate unit test stubs from a Jira ticket's AC checklist. Usage: /gen-unit-tests AGA-XXX [--file path/to/file.js] [--dry-run]
---

# gen-unit-tests

Generate unit test stubs from a Jira ticket's acceptance criteria checklist. Each AC item becomes one or more test blocks mapped to the correct test pattern for this codebase (vanilla JS / Node, no framework).

## Usage

```
/gen-unit-tests AGA-XXX
/gen-unit-tests AGA-XXX --file common/appointment-form.js
/gen-unit-tests AGA-XXX --dry-run
```

- `AGA-XXX` — required. The Jira ticket ID.
- `--file <path>` — optional. The source file under test. If omitted, Claude infers it from the ticket title and current git branch.
- `--dry-run` — optional. Print the generated test to the console without writing any file.

---

## Workflow — follow these steps in order

### Step 1 — Parse arguments

Extract from `$ARGUMENTS`:
- `ticket` — the Jira ticket ID (e.g. `AGA-894`)
- `targetFile` — value after `--file`, or `null`
- `dryRun` — `true` if `--dry-run` is present

### Step 2 — Fetch the AC checklist from Jira

Use `mcp__atlassian__getTeamworkGraphContext` to retrieve the Jira issue. Pass the ticket ID as the identifier. Extract:
- The ticket **title** (summary field)
- Every **acceptance criteria** item from the checklist (the same checklist shown in the Herocoders/Olex plugin)

If the MCP tool returns no checklist, fall back to running:
```bash
npx tsx scripts/gen-tests.ts --ticket <ticket> --dry-run
```
via Bash to read the raw checklist data.

Print the fetched AC items to the user so they can confirm before proceeding.

### Step 3 — Identify the target file

If `--file` was provided, use it directly.

Otherwise, infer the target by doing **all** of the following and picking the best match:
1. Read the current git branch name: `git branch --show-current`
2. Look at the ticket title for keywords
3. Run `grep -r "<keyword from ticket title>" . --include="*.js" -l --exclude-dir=node_modules` to find candidate files
4. Prefer files in `common/`, then root-level `.js` files
5. Read the top 60 lines of the candidate file to understand its exports and purpose

Tell the user which file you identified and why.

### Step 4 — Classify each AC item

For every AC item, classify it into exactly one test type using the decision table below.

| If the AC item mentions… | Test type |
|---|---|
| "API", "fetch", "endpoint", "returns data from", "backend", "server response", "HTTP" | **NETWORK** — stub `global.fetch` and test the function directly |
| "renders", "displays", "shows", "visible", "appears", "label", "button", "text", "DOM" | **DOM** — use `jsdom` to test DOM mutations |
| "validates", "required", "error message", "format", "invalid", "regex", "phone", "email" | **SCHEMA** — test the validation logic or regex directly, no DOM needed |
| "clicks", "taps", "selects", "fills", "types", "submits", "interacts" | **FORM** — use `jsdom` with `runScripts: 'dangerously'` + simulate events |
| "navigates to", "redirects", "page changes", "goes to" | **E2E** — Playwright `test()` stub |
| "sessionStorage", "localStorage", "exposes", "stores" | **SIDE-EFFECT** — spy on storage APIs |
| Anything else / ambiguous | **TODO** — stub with a `throw new Error('RED')` and the full AC text |

### Step 5 — Generate the test file

Build the test file. Use the classified test type for each AC item.

#### File header

```js
/**
 * AC: <ticket title>
 * Ticket: <ticket ID>
 *
 * AC-1: <full AC text>
 * AC-2: <full AC text>
 */
```

#### Imports — include only what the generated tests actually use

```js
// For DOM / FORM tests:
const { JSDOM } = require('jsdom');

// For NETWORK tests — stub fetch inline, no library needed

// For E2E tests (Playwright):
import { test, expect } from '@playwright/test';

// The subject under test (adjust path):
// const { myFunction } = require('./common/appointment-form');
```

#### Test structure — one `describe` per file, one nested `describe` per AC item

```js
describe('<FeatureName>', () => {

  // AC-1: <full AC text>
  describe('AC-1: <short label>', () => {
    it('should <expected behaviour>', () => {
      // ...
    });
  });

  // AC-2: <full AC text>
  describe('AC-2: <short label>', () => {
    it('TODO: <full AC text>', () => {
      throw new Error('RED — implement this test');
    });
  });

});
```

#### Pattern — NETWORK

```js
describe('AC-N: <label>', () => {
  let originalFetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it('returns data on success', async () => {
    global.fetch = async () => ({ ok: true, json: async () => ({ /* mock */ }) });
    // const result = await myApiCall();
    // assert.deepEqual(result, { ... });
    throw new Error('RED — implement');
  });

  it('throws when the API returns an error', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });
    throw new Error('RED — implement');
  });
});
```

#### Pattern — DOM

```js
describe('AC-N: <label>', () => {
  let document;
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
    document = dom.window.document;
  });

  it('renders the expected element', () => {
    // document.body.innerHTML = '<div id="app"></div>';
    // myRenderFunction(document);
    // assert.ok(document.querySelector('#expected'));
    throw new Error('RED — implement');
  });
});
```

#### Pattern — FORM

```js
describe('AC-N: <label>', () => {
  let dom;
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
    });
  });

  it('validates required fields before submit', () => {
    // set up form in dom.window.document
    // simulate input + submit event
    throw new Error('RED — implement');
  });
});
```

#### Pattern — SIDE-EFFECT

```js
describe('AC-N: <label>', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('stores the value in localStorage after call', () => {
    // myFunction();
    // assert.equal(localStorage.getItem('key'), 'expected');
    throw new Error('RED — implement');
  });
});
```

#### Pattern — E2E (Playwright)

```js
import { test, expect } from '@playwright/test';

test.describe('AC-N: <label>', () => {
  test('TODO: fill in the scenario', async ({ page }) => {
    await page.goto('/');
    // await page.click('...');
    // await expect(page.locator('...')).toBeVisible();
    expect(false).toBe(true); // RED
  });
});
```

### Step 6 — Determine the output file path

- Unit / DOM / FORM / NETWORK tests → `tests/<ticket_slug>/<slug>.test.js`
- E2E tests → `e2e/<ticket_slug>/<slug>.spec.ts`

**Always use `.test.js`** for unit tests in this project (no TypeScript, no JSX).
Use `.spec.ts` only for Playwright E2E.

### Step 7 — Write or print

- If `--dry-run`: print the full generated file content. Do **not** write any file.
- Otherwise: write the file using the Write tool. If a file already exists, read it first and merge new `describe` blocks — do not overwrite existing tests.

### Step 8 — Report

After writing, report:
1. The output file path
2. How many AC items were processed
3. The test type assigned to each AC item
4. The command to run: `node --test tests/<path>`
5. Any AC items stubbed as TODO and why

---

## Rules — always follow these

- Never share state across tests — each `it()` gets a fresh setup via `beforeEach`
- Never call the real Jira/external APIs in tests — stub `fetch` inline
- Use `node:assert` (built-in) for assertions in unit tests — no extra libraries needed
- For E2E tests use `@playwright/test` — already installed as a devDependency
- Never add tests for implementation details — test observable behaviour (what the page shows or what data is returned)
- If the `playwright.config.ts` does not exist yet, remind the user to run `npx playwright init` before running E2E tests
