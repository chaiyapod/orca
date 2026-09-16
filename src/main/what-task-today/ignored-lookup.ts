// Resolves a display title/url for a manually-entered issue key that was
// never scanned into a card. Called once at ignore-time and persisted — never
// on every read, so a slow/unreachable Jira never blocks the ignored list.

import { getIssue } from '../jira/issues'

const LOOKUP_TIMEOUT_MS = 6_000

export async function resolveJiraTitleForKey(
  issueKey: string
): Promise<{ title: string; url: string }> {
  try {
    const issue = await Promise.race([
      getIssue(issueKey),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS))
    ])
    return issue ? { title: issue.title, url: issue.url } : { title: '', url: '' }
  } catch {
    return { title: '', url: '' }
  }
}
