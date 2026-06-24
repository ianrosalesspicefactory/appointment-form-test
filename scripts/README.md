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
