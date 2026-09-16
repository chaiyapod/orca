// Data model for the "What Task Today" feature: Jira cards summarized ahead of
// time into a human-readable brief plus an agent-ready implementation plan.

export type WhatTaskTodayCard = {
  issueKey: string
  title: string
  url: string
  // Jira `updated` timestamp (ISO string) — used to skip re-summarizing unchanged cards.
  updated: string
  // Markdown, scannable in the morning.
  humanSummary: string
  // Markdown, full implementation plan; injected as the agent's starting context on Start.
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

export type WhatTaskTodayReplanResponse =
  | { ok: true; card: WhatTaskTodayCard }
  | { ok: false; error: string }

// Which Claude model the summarizer runs (`claude -p --model <model>`).
// null = the CLI's default model (no flag).
export type WhatTaskTodaySettings = {
  model: string | null
}

// Aliases the `claude` CLI accepts for --model. Kept minimal for MVP.
export const WHAT_TASK_TODAY_MODEL_OPTIONS = ['opus', 'sonnet', 'haiku'] as const

export function emptyWhatTaskTodaySettings(): WhatTaskTodaySettings {
  return { model: null }
}

// A recorded scan/re-plan failure, shown as a rolling error log in Settings.
export type WhatTaskTodayLogEntry = { at: number; message: string }
