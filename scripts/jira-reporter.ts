/**
 * Jira API helpers used by ac-playwright.ts.
 * Requires env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env') });

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function authHeader(): Record<string, string> {
  const encoded = Buffer.from(
    `${getEnv('JIRA_EMAIL')}:${getEnv('JIRA_API_TOKEN')}`
  ).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

export interface ChecklistData {
  items: string[];
  total: number;
  checked: number;
  allDone: boolean;
}

/**
 * Fetches the AC checklist from Jira issue properties (Herocoders/Olex plugin).
 * Returns null if no checklist exists on the ticket.
 */
export async function getChecklist(ticket: string): Promise<ChecklistData | null> {
  const base = getEnv('JIRA_BASE_URL');
  const res = await fetch(
    `${base}/rest/api/3/issue/${ticket}/properties/checklist`,
    { headers: { ...authHeader(), Accept: 'application/json' } }
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      console.error(`  ❌  Jira auth failed (HTTP ${res.status}). Check JIRA_EMAIL and JIRA_API_TOKEN.`);
    } else if (res.status === 404) {
      console.error(`  ❌  Ticket ${ticket} not found on ${base} (HTTP 404). Check JIRA_BASE_URL is correct.`);
    } else {
      console.error(`  ❌  Jira API error: HTTP ${res.status} from ${base}`);
    }
    return null;
  }

  const data = await res.json();
  const v = data.value;
  if (!v || !('allItems' in v)) return null;

  const raw: string = typeof v.items === 'string' ? v.items : '';
  const items = raw
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  return {
    items,
    total: v.allItems as number,
    checked: (v.allItems as number) - (v.uncheckedItems as number),
    allDone: v.allItemsCompleted === true,
  };
}

/**
 * Attaches a screenshot file to a Jira issue.
 */
export async function attachScreenshot(ticket: string, filePath: string): Promise<void> {
  const base = getEnv('JIRA_BASE_URL');
  const filename = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileData], { type: 'image/png' }), filename);

  const res = await fetch(
    `${base}/rest/api/3/issue/${ticket}/attachments`,
    {
      method: 'POST',
      headers: {
        ...authHeader(),
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.warn(`  ⚠️  Could not attach ${filename}: HTTP ${res.status} — ${text.slice(0, 150)}`);
  }
}

/**
 * Posts a plain-text comment to a Jira issue using ADF paragraph nodes.
 */
export async function postComment(ticket: string, text: string): Promise<void> {
  const base = getEnv('JIRA_BASE_URL');

  const content = text.split('\n').map(line => ({
    type: 'paragraph',
    content: line.trim() ? [{ type: 'text', text: line }] : [],
  }));

  const res = await fetch(
    `${base}/rest/api/3/issue/${ticket}/comment`,
    {
      method: 'POST',
      headers: {
        ...authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        body: { version: 1, type: 'doc', content },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.warn(`  ⚠️  Could not post comment: HTTP ${res.status} — ${text.slice(0, 150)}`);
  }
}
