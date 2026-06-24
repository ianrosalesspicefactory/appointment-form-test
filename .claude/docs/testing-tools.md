# Testing Tools

Two tools cover the testing workflow for this project. Use both before merging a feature ticket.

| Tool | What it does | When to use |
|---|---|---|
| `npm run ac:check` | Runs the app in a real browser, checks AC items, posts screenshots to Jira | Final QA check — confirms the feature works end-to-end |
| `/gen-unit-tests` | Reads the same AC checklist, generates test stubs | During development — fast, no browser, no server needed |

---

## 1. AC Playwright Check — `npm run ac:check`

Runs a headless Chromium browser against the live app server, auto-detects which scenarios to run from the Jira checklist, takes screenshots, and (optionally) posts results back to Jira.

Full usage guide: [`scripts/README.md`](../../scripts/README.md)

**Quick start:**

```bash
# Terminal 1 — start the app
npm start

# Terminal 2 — run the check
JIRA_BASE_URL=https://spicefactoryphilippines.atlassian.net \
JIRA_EMAIL=your-email@spice-factory.ph \
JIRA_API_TOKEN="your-token" \
npm run ac:check -- --ticket AGA-XXX
```

Required env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`

---

## 2. Unit Test Generator — `/gen-unit-tests` (Claude Code skill)

> Requires [Claude Code](https://claude.ai/code) to be open in this project.

Reads the Jira ticket's AC checklist and generates test stubs. Each AC item becomes one or more test blocks using the correct pattern (network fetch stub, jsdom DOM test, Playwright E2E, or plain behavior test).

### Usage

Type one of these directly in the Claude Code chat:

```
/gen-unit-tests AGA-XXX
```
Most common. Claude infers which file to test from the current git branch and ticket title.

```
/gen-unit-tests AGA-XXX --file common/appointment-form.js
```
Use when Claude picks the wrong file, or when you already know the target.

```
/gen-unit-tests AGA-XXX --dry-run
```
Prints the generated tests in chat without writing any file.

### What gets generated

The skill maps each AC item to a test type automatically:

| AC item mentions… | Generated test type |
|---|---|
| API, fetch, endpoint, server response | `global.fetch` stub + direct function call |
| renders, displays, shows, DOM element | `jsdom` DOM test |
| validates, required, error message, phone, email | Pure logic / regex assertion |
| clicks, types, fills, submits | `jsdom` form + event simulation |
| navigates to, redirects, page changes | Playwright `test()` stub |
| sessionStorage, localStorage, exposes | Storage spy test |
| Ambiguous / unclear | `throw new Error('RED')` stub with the full AC text |

### Output file location

- Unit tests → `tests/<ticket>/`
- E2E tests → `e2e/<ticket>/`

### Running the generated tests

```bash
# Run unit tests (Node built-in test runner)
node --test tests/

# Run a specific file
node --test tests/aga_900/my-test.test.js

# Run E2E tests (Playwright)
npm run test:e2e
```

### Requirements

- Claude Code open in this project directory
- Atlassian MCP configured (for Jira access)
- No extra env vars needed for the skill itself

---

## How the two tools relate

Both tools read from the **same Jira AC checklist**. They test at different levels:

```
AC checklist
     │
     ├── /gen-unit-tests ──→ node --test (tests/)
     │                        Fast. No browser. Runs in CI.
     │                        Tests logic, DOM, fetch in isolation.
     │
     └── npm run ac:check ──→ Playwright (screenshots → Jira)
                              Slow. Real browser. Run before PR review.
                              Tests the full feature end-to-end.
```

The recommended order for a feature ticket:

1. Run `/gen-unit-tests AGA-XXX` early — write the tests alongside the feature
2. Run `node --test tests/` to confirm all unit tests pass
3. Run `npm run ac:check -- --ticket AGA-XXX` before requesting review — confirms the feature works in a real browser and posts evidence to Jira
