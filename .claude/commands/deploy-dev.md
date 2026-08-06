---
description: "Point every test landing page at the development appointment-form script, commit, and deploy to the Heroku dev app. Usage: /deploy-dev"
---

# deploy-dev

Point every test landing page at the development appointment-form script, commit, and deploy to the Heroku dev app.

## Target

- Heroku app: `appointment-ui-test-dev` — https://appointment-ui-test-dev-9b0e8e376ccb.herokuapp.com/
- Git remote: `heroku-dev` → `https://git.heroku.com/appointment-ui-test-dev.git`. If it doesn't exist yet, add it:
  ```
  git remote add heroku-dev https://git.heroku.com/appointment-ui-test-dev.git
  ```

## Script URL for this environment

```
https://aga-online-development.s3.ap-northeast-1.amazonaws.com/js_hosted_files/1cf00003-0000-4000-8000-000000000003/1777345273574_appointment-form.js
```

## Files to update

- `index.html`
- `lp-sample/index.html`
- `normal/index.html`
- `instant/index.html`
- `mixed/index.html`

---

## Workflow — follow these steps in order

### Step 1 — Check the working tree

Run `git status`. If there are uncommitted changes outside the 5 files above, tell the user and ask whether to leave them uncommitted (default) or include them — never silently sweep unrelated work into the deploy commit.

### Step 2 — Update the widget script tag in each file

In each of the 5 files, find the single `<script src="...">` tag that loads the appointment-form widget — an absolute `https://` URL pointing at an S3 bucket or a `*.herokuapp.com` lp-config endpoint (never the relative `app.js` or `styles.css` tags, and never any other `<script>` in the file). Replace only the URL inside `src="..."` with the development URL above. Leave every other line and attribute untouched.

### Step 3 — Show the diff

Run:
```
git diff -- index.html lp-sample/index.html normal/index.html instant/index.html mixed/index.html
```
Show it to the user. If the diff is empty, all pages already point at development — report that and stop (nothing to deploy).

### Step 4 — Commit

Stage exactly the 5 files above (never `git add -A` or `git add .`):
```
git add index.html lp-sample/index.html normal/index.html instant/index.html mixed/index.html
git commit -m "Point all test pages to development appointment-form script"
```

### Step 5 — Confirm before deploying

Pushing to Heroku deploys to a real, shared app immediately. Summarize the diff and ask the user to explicitly confirm before running the push in Step 6 — never push automatically.

### Step 6 — Push

First fetch and check ancestry so a divergence is caught *before* attempting the push, not discovered as a rejection:
```
git fetch heroku-dev
git merge-base --is-ancestor heroku-dev/master master && echo OK || echo DIVERGED
```
If `DIVERGED`: **stop** — do not force-push automatically. Show the user `git log heroku-dev/master --oneline` vs local `master` and `git diff --stat heroku-dev/master master`, explain what's on dev that isn't on local (or vice versa), and ask how they want to reconcile (force-push vs merge) before touching `--force`. State plainly that **the deploy has not happened yet** — don't let the command exit quietly on this branch.

If `OK`, push:
```
git push heroku-dev master
```

### Step 7 — Verify

```
heroku releases -a appointment-ui-test-dev | head -3
for p in index.html lp-sample/index.html normal/index.html instant/index.html mixed/index.html; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://appointment-ui-test-dev-9b0e8e376ccb.herokuapp.com/$p"
done
```
Report the new release version and confirm each page returns 200.

## Rules

- Never touch files outside the 5 listed above.
- Never force-push without explicit user confirmation.
- This command only ever targets `appointment-ui-test-dev` — never guess or substitute a different Heroku app.
