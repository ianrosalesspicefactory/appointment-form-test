# PR Acceptance Gate

**Workflow file:** `.github/workflows/check-acceptance-criteria.yml`
**Trigger:** Every time a PR is opened, edited, synced, or marked ready for review.

---

## Overview

This workflow enforces two quality gates on every pull request. **Both jobs must pass before a PR can be merged.**

---

## Jobs

### Job 1 — Jira Checklist Complete (`jira-checklist-check`)

Reads the Jira ticket linked to the branch and verifies that every checklist item is checked off.

**Fails when:**
- Any checklist item on the Jira ticket is unchecked.
- No checklist exists on the ticket.
- No Jira ticket ID is found in the branch name (see [Branch Naming](#branch-naming)).

### Job 2 — Video / Screenshot Evidence (`check-acceptance-criteria`)

Verifies that at least one piece of visual evidence is attached before merging.

**Accepted evidence — any one of the following is sufficient:**

| Where | What |
|---|---|
| PR description (GitHub) | Link to Loom, YouTube, Google Drive, or Vimeo |
| Jira ticket — attachments | Video file: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`, `.m4v`, `.qt` |
| Jira ticket — attachments | Image file: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` |
| Jira ticket — comments | Video link or image embedded in any comment |

---

## Branch Naming

The workflow extracts the Jira ticket ID from the branch name using the pattern:

```
[A-Z]+-[0-9]+
```

Job 1 is a **hard failure** if no ticket ID is detected — the PR will be blocked immediately.

### Valid branch names

```
feature/AGA-123-add-booking-form
bugfix/AGA-456-fix-date-picker
AGA-789-refactor-api-calls
feature/AGA-1234
```

### Invalid branch names

```
feature/add-booking-form     # No ticket ID
fix-something                # No ticket ID
aga-123-lowercase            # Must be uppercase letters
```

> The ticket prefix must use **uppercase letters** followed by a **hyphen and numbers** (e.g. `AGA-123`, `PROJ-99`).

---

## Pre-PR Checklist

Before opening a pull request, confirm all three of the following:

1. **Branch name** contains a Jira ticket ID in uppercase — e.g. `feature/AGA-123-description`.
2. **Jira checklist** — every acceptance criteria item on the ticket is checked off.
3. **Evidence** — a screen recording or screenshot is attached to the Jira ticket, OR a video link is pasted into the PR description.

---

## Required GitHub Secrets

The following secrets must be configured in the repository settings for the workflow to function:

| Secret | Purpose |
|---|---|
| `JIRA_BASE_URL` | Your Jira instance base URL (e.g. `https://your-org.atlassian.net`) |
| `JIRA_EMAIL` | Email of the Jira service account |
| `JIRA_API_TOKEN` | API token for the Jira service account |
