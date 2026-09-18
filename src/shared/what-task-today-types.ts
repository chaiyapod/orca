// Data model for the "What Task Today" feature: Jira cards summarized ahead of
// time into a human-readable brief plus an agent-ready implementation plan.

export type WhatTaskTodayCard = {
  issueKey: string
  title: string
  url: string
  // Jira status category key (e.g. "new", "indeterminate") — only "new" cards
  // get summarized by the agent; others are detected/listed only.
  statusCategory: string
  // Jira's own status name (e.g. "Develop"), shown as a badge — teams rename
  // statuses within a category, so the category key alone isn't display-ready.
  statusName: string
  // Jira `updated` timestamp (ISO string) as of the last summarize — used to
  // skip re-summarizing unchanged cards. Detect-only upserts leave this alone.
  updated: string
  // Markdown, scannable in the morning. Empty for a detect-only card (not yet
  // in "new" status) that hasn't been summarized.
  humanSummary: string
  // Markdown, full implementation plan; injected as the agent's starting context on Start.
  // Empty for a detect-only card.
  agentContext: string
  // Epoch ms the summary was generated.
  generatedAt: number
}

// An ignored issue's title/url, captured once at ignore time (from the scanned
// card if there was one, else fetched from Jira a single time) so reading the
// ignored list is a plain disk read — never a live Jira call.
export type WhatTaskTodayIgnoredEntry = {
  issueKey: string
  title: string
  url: string
}

export type WhatTaskTodayStoreFile = {
  version: 1
  cards: Record<string, WhatTaskTodayCard>
  ignored: Record<string, WhatTaskTodayIgnoredEntry>
}

export function emptyWhatTaskTodayStore(): WhatTaskTodayStoreFile {
  return { version: 1, cards: {}, ignored: {} }
}

export type WhatTaskTodayScanResult = {
  scanned: number
  summarized: number
  skipped: number
  errors: string[]
}

export type WhatTaskTodayScanResponse =
  | { ok: true; result: WhatTaskTodayScanResult }
  | { ok: false; error: string }

export type WhatTaskTodayMcpConfigSaveResult = { ok: true } | { ok: false; error: string }

export type WhatTaskTodayAgentContextFileResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export type WhatTaskTodayReplanResponse =
  | { ok: true; card: WhatTaskTodayCard }
  | { ok: false; error: string }

// Which Claude model the summarizer runs (`claude -p --model <model>`), and
// which exact Jira status names a scan includes (picked in Settings from the
// connected site's real status list, category "To Do"/"In Progress" only —
// "Done" isn't offered since a scan never summarizes or detects it).
// model: null = the CLI's default model (no flag).
// statusNames: null = default (every status in Jira's "new"/To-Do category —
// matches the old behavior, no live Jira call needed to resolve it).
// prePrompt: null = no extra instructions; else prepended to every summarize prompt
// (e.g. house conventions, which repos to prefer) ahead of the per-card instructions.
export type WhatTaskTodaySettings = {
  model: string | null
  statusNames: string[] | null
  prePrompt: string | null
}

// Aliases the `claude` CLI accepts for --model. Kept minimal for MVP.
export const WHAT_TASK_TODAY_MODEL_OPTIONS = ['opus', 'sonnet', 'haiku'] as const

export function emptyWhatTaskTodaySettings(): WhatTaskTodaySettings {
  return { model: null, statusNames: null, prePrompt: null }
}

// A recorded scan/re-plan failure, shown as a rolling error log in Settings.
export type WhatTaskTodayLogEntry = { at: number; message: string }
