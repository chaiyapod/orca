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

export type WhatTaskTodayAgentContextFileResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export type WhatTaskTodayReplanResponse =
  | { ok: true; card: WhatTaskTodayCard }
  | { ok: false; error: string }

// Jira's built-in status categories (`status.categoryKey`).
export type WhatTaskTodayStatusCategory = 'new' | 'indeterminate' | 'done'

export const WHAT_TASK_TODAY_STATUS_CATEGORIES: {
  key: WhatTaskTodayStatusCategory
  label: string
}[] = [
  { key: 'new', label: 'To Do' },
  { key: 'indeterminate', label: 'In Progress' },
  { key: 'done', label: 'Done' }
]

// A scan without resolution=Unresolved cards already excludes most Done
// cards at the Jira query level, so this is what the user actually controls.
export const DEFAULT_WHAT_TASK_TODAY_STATUS_CATEGORIES: WhatTaskTodayStatusCategory[] = [
  'new',
  'indeterminate'
]

// Which Claude model the summarizer runs (`claude -p --model <model>`), and
// which Jira status categories a scan pulls in.
// model: null = the CLI's default model (no flag).
// statusCategories: null = default (To Do + In Progress).
// prePrompt: null = no extra instructions; else prepended to every summarize prompt
// (e.g. house conventions, which repos to prefer) ahead of the per-card instructions.
export type WhatTaskTodaySettings = {
  model: string | null
  statusCategories: WhatTaskTodayStatusCategory[] | null
  prePrompt: string | null
}

// Aliases the `claude` CLI accepts for --model. Kept minimal for MVP.
export const WHAT_TASK_TODAY_MODEL_OPTIONS = ['opus', 'sonnet', 'haiku'] as const

export function emptyWhatTaskTodaySettings(): WhatTaskTodaySettings {
  return { model: null, statusCategories: null, prePrompt: null }
}

export function resolveWhatTaskTodayStatusCategories(
  settings: WhatTaskTodaySettings
): WhatTaskTodayStatusCategory[] {
  return settings.statusCategories && settings.statusCategories.length > 0
    ? settings.statusCategories
    : DEFAULT_WHAT_TASK_TODAY_STATUS_CATEGORIES
}

// A recorded scan/re-plan failure, shown as a rolling error log in Settings.
export type WhatTaskTodayLogEntry = { at: number; message: string }
