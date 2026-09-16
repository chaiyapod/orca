// Pure operations on the What Task Today store file. No disk I/O so they stay
// unit-testable; summary-store.ts wraps these with read/write.

import {
  emptyWhatTaskTodayStore,
  type WhatTaskTodayCard,
  type WhatTaskTodayIgnoredEntry,
  type WhatTaskTodayStoreFile
} from '../../shared/what-task-today-types'

// True when the card is new or Jira reports a newer `updated` than what we stored.
// Ignored cards never re-summarize.
export function shouldReSummarize(
  file: WhatTaskTodayStoreFile,
  issueKey: string,
  updated: string
): boolean {
  if (Object.hasOwn(file.ignored, issueKey)) {
    return false
  }
  const existing = file.cards[issueKey]
  return !existing || existing.updated !== updated
}

// Upsert by issue key. Ignored cards are dropped rather than stored.
export function upsertCardInFile(
  file: WhatTaskTodayStoreFile,
  card: WhatTaskTodayCard
): WhatTaskTodayStoreFile {
  if (Object.hasOwn(file.ignored, card.issueKey)) {
    return file
  }
  return { ...file, cards: { ...file.cards, [card.issueKey]: card } }
}

// Dismiss = hide the card from the active list and remember the key so future
// scans skip re-summarizing it. The card's data is kept (not deleted): if the
// user unignores it later, it reappears instantly with its existing summary —
// no rescan needed. Title/url for the ignored-list display come from the
// scanned card when there is one; otherwise from the caller-supplied fallback
// (a one-time Jira lookup for a manually entered key that was never scanned).
export function dismissInFile(
  file: WhatTaskTodayStoreFile,
  issueKey: string,
  fallback?: { title: string; url: string }
): WhatTaskTodayStoreFile {
  const card = file.cards[issueKey]
  const entry: WhatTaskTodayIgnoredEntry = card
    ? { issueKey, title: card.title, url: card.url }
    : (file.ignored[issueKey] ?? {
        issueKey,
        title: fallback?.title ?? '',
        url: fallback?.url ?? ''
      })
  return { ...file, ignored: { ...file.ignored, [issueKey]: entry } }
}

export function unignoreInFile(
  file: WhatTaskTodayStoreFile,
  issueKey: string
): WhatTaskTodayStoreFile {
  const { [issueKey]: _removed, ...rest } = file.ignored
  return { ...file, ignored: rest }
}

// Drop stored cards that no longer match the current scan (closed / reassigned).
// Ignored keys are untouched.
export function pruneCardsInFile(
  file: WhatTaskTodayStoreFile,
  liveKeys: readonly string[]
): WhatTaskTodayStoreFile {
  const live = new Set(liveKeys)
  const cards: Record<string, WhatTaskTodayCard> = {}
  for (const [key, card] of Object.entries(file.cards)) {
    if (live.has(key)) {
      cards[key] = card
    }
  }
  return { ...file, cards }
}

// Clears all synced Jira cards (a manual "Clear data" action). Ignored
// entries, MCP config, and model settings are untouched — those are user
// configuration, not data synced from Jira.
export function clearCardsInFile(file: WhatTaskTodayStoreFile): WhatTaskTodayStoreFile {
  return { ...file, cards: {} }
}

// Non-ignored cards, newest summary first.
export function listActiveCards(file: WhatTaskTodayStoreFile): WhatTaskTodayCard[] {
  return Object.values(file.cards)
    .filter((card) => !Object.hasOwn(file.ignored, card.issueKey))
    .sort((a, b) => b.generatedAt - a.generatedAt)
}

export function listIgnoredEntries(file: WhatTaskTodayStoreFile): WhatTaskTodayIgnoredEntry[] {
  return Object.values(file.ignored).sort((a, b) => a.issueKey.localeCompare(b.issueKey))
}

export function normalizeStoreFile(input: unknown): WhatTaskTodayStoreFile {
  if (!input || typeof input !== 'object') {
    return emptyWhatTaskTodayStore()
  }
  const fields = new Map<string, unknown>(Object.entries(input))
  const cards: Record<string, WhatTaskTodayCard> = {}
  const rawCards = fields.get('cards')
  if (rawCards && typeof rawCards === 'object') {
    for (const [key, value] of Object.entries(rawCards)) {
      const card = normalizeCard(value)
      if (card) {
        cards[key] = card
      }
    }
  }
  const ignored: Record<string, WhatTaskTodayIgnoredEntry> = {}
  const rawIgnored = fields.get('ignored')
  if (Array.isArray(rawIgnored)) {
    // Legacy shape (bare issue keys, no captured title/url).
    for (const value of rawIgnored) {
      if (typeof value === 'string' && value.trim()) {
        ignored[value] = { issueKey: value, title: '', url: '' }
      }
    }
  } else if (rawIgnored && typeof rawIgnored === 'object') {
    for (const [key, value] of Object.entries(rawIgnored)) {
      const entry = normalizeIgnoredEntry(value)
      if (entry) {
        ignored[key] = entry
      }
    }
  }
  return { version: 1, cards, ignored }
}

function normalizeIgnoredEntry(input: unknown): WhatTaskTodayIgnoredEntry | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const f = new Map<string, unknown>(Object.entries(input))
  const issueKey = f.get('issueKey')
  const title = f.get('title')
  const url = f.get('url')
  if (typeof issueKey !== 'string') {
    return null
  }
  return {
    issueKey,
    title: typeof title === 'string' ? title : '',
    url: typeof url === 'string' ? url : ''
  }
}

function normalizeCard(input: unknown): WhatTaskTodayCard | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const f = new Map<string, unknown>(Object.entries(input))
  const issueKey = f.get('issueKey')
  const title = f.get('title')
  const url = f.get('url')
  const updated = f.get('updated')
  const humanSummary = f.get('humanSummary')
  const agentContext = f.get('agentContext')
  const generatedAt = f.get('generatedAt')
  if (
    typeof issueKey !== 'string' ||
    typeof title !== 'string' ||
    typeof url !== 'string' ||
    typeof updated !== 'string' ||
    typeof humanSummary !== 'string' ||
    typeof agentContext !== 'string' ||
    typeof generatedAt !== 'number'
  ) {
    return null
  }
  return { issueKey, title, url, updated, humanSummary, agentContext, generatedAt }
}
