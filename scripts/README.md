# AC Playwright Check — Usage Guide

Automatically reads the acceptance criteria checklist from a Jira ticket, runs Playwright browser tests against each item, takes screenshots, and (optionally) posts the results back to Jira as a comment with the screenshots attached.

---

## Requirements

Before running, make sure you have:

1. **Dependencies installed**
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **App server running** (in a separate terminal)
   ```bash
   npm start
   ```

3. **Environment variables set** — see [Environment Variables](#environment-variables) below.

---

## Environment Variables

| Variable | Description |
|---|---|
| `JIRA_BASE_URL` | Your Jira workspace URL |
| `JIRA_EMAIL` | Your Atlassian account email |
| `JIRA_API_TOKEN` | Your Atlassian API token |
| `APP_URL` | *(optional)* App URL to test. Defaults to `http://localhost:3000` |

> **Never commit your API token.** Set these in your terminal session or a local `.env` file that is git-ignored.

---

## Running the Check

### Step 1 — Start the app server

```bash
npm start
```

### Step 2 — Run the AC check

**Mac / Linux:**
```bash
JIRA_BASE_URL=https://spicefactoryphilippines.atlassian.net \
JIRA_EMAIL=your-email@spice-factory.ph \
JIRA_API_TOKEN="your-api-token-here" \
npm run ac:check -- --ticket AGA-900
```

**Windows (Git Bash / MINGW64):**
```bash
export JIRA_BASE_URL=https://spicefactoryphilippines.atlassian.net
export JIRA_EMAIL=your-email@spice-factory.ph
export JIRA_API_TOKEN="your-api-token-here"
npm run ac:check -- --ticket AGA-900
```

Replace `AGA-900` with the ticket you are working on.

---

## What Happens When You Run It

### 1. Reads the Jira checklist

The script fetches the acceptance criteria checklist from the Jira ticket and prints each item.

### 2. Auto-detects what to test

Based on the checklist text, the script decides which scenarios to run:

| Keywords found in checklist | Scenario triggered |
|---|---|
| `error`, `crash`, `no errors`, `graceful` | Console error check |
| `submit`, `form`, `input`, `click`, `button` | Form interaction check |
| *(any ticket, always runs)* | Default screenshot |

### 3. Runs Playwright scenarios

The script opens a headless Chromium browser and runs each scenario automatically.

### 4. Prints the report + posts to Jira

After all scenarios finish you see a full report. You are then asked before anything is posted to Jira:

```
Post report + screenshots to Jira? (y/n):
```

- Type **`y`** — posts the report as a Jira comment and attaches all screenshots.
- Type **`n`** — exits without posting. Useful for local checks.

---

## Testing a Different URL

Pass the `--url` flag to test against staging or any other environment:

```bash
... npm run ac:check -- --ticket AGA-900 --url https://staging.example.com
```

---

## Watching the Browser (Headed Mode)

By default the browser runs **headless** (invisible). To open a real browser window and watch every step happen automatically — navigation, clicks, scrolling — use headed mode.

### Quick command

```bash
# Terminal 1 — start the app
npm start

# Terminal 2 — watch the browser run the AC check
npm run ac:watch -- --ticket AGA-XXX
```

This opens a Chromium window. You will see the browser:
1. Load the LP page
2. Click **対面相談**
3. Click **一覧から選択する**
4. Navigate area → prefecture → station list
5. Scroll to the last station card and tap it
6. Take screenshots at each step

Each action is slowed down by **800ms** so it is easy to follow. The terminal still prints the full report when it finishes.

### Adjust the speed

```bash
# Slower — easier to follow each click
npm run ac:watch -- --ticket AGA-XXX --slowmo 1500

# Faster — quicker run, still visible
npm run ac:watch -- --ticket AGA-XXX --slowmo 300
```

### Manual headed flag (without the npm shortcut)

```bash
JIRA_BASE_URL=https://spicefactoryphilippines.atlassian.net \
JIRA_EMAIL=your-email@spice-factory.ph \
JIRA_API_TOKEN="your-api-token" \
npx tsx scripts/ac-playwright.ts --ticket AGA-XXX --headed --slowmo 800
```

### Notes

- Headed mode is for **local use only** — CI always runs headless.
- The browser window closes automatically when the script finishes.
- Screenshots are still saved to `/tmp/ac-screenshots/<TICKET>/` even in headed mode.
