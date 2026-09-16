import { describe, expect, it } from 'vitest'
import { emptyWhatTaskTodayStore, type WhatTaskTodayCard } from '../../shared/what-task-today-types'
import {
  clearCardsInFile,
  dismissInFile,
  listActiveCards,
  listIgnoredEntries,
  pruneCardsInFile,
  shouldReSummarize,
  unignoreInFile,
  upsertCardInFile
} from './summary-store-logic'

function card(overrides: Partial<WhatTaskTodayCard> = {}): WhatTaskTodayCard {
  return {
    issueKey: 'ABC-1',
    title: 'Do the thing',
    url: 'https://jira/ABC-1',
    updated: '2026-01-01T00:00:00.000Z',
    humanSummary: 'summary',
    agentContext: 'plan',
    generatedAt: 1,
    ...overrides
  }
}

describe('summary-store-logic', () => {
  it('re-summarizes new and changed cards, skips unchanged and ignored', () => {
    let file = upsertCardInFile(emptyWhatTaskTodayStore(), card())
    expect(shouldReSummarize(file, 'ABC-1', '2026-01-01T00:00:00.000Z')).toBe(false)
    expect(shouldReSummarize(file, 'ABC-1', '2026-02-01T00:00:00.000Z')).toBe(true)
    expect(shouldReSummarize(file, 'NEW-9', 'anything')).toBe(true)

    file = dismissInFile(file, 'ABC-1')
    expect(shouldReSummarize(file, 'ABC-1', 'anything')).toBe(false)
  })

  it('dismiss hides the card from the active list but keeps its data for instant restore', () => {
    let file = upsertCardInFile(emptyWhatTaskTodayStore(), card())
    file = dismissInFile(file, 'ABC-1')
    // Card data is retained (not deleted) so unignore can restore it instantly.
    expect(file.cards['ABC-1']).toBeDefined()
    expect(listActiveCards(file)).toEqual([])
    expect(file.ignored['ABC-1']).toEqual({
      issueKey: 'ABC-1',
      title: 'Do the thing',
      url: 'https://jira/ABC-1'
    })

    // A later scan must not resurrect a dismissed card into the active list.
    file = upsertCardInFile(file, card())
    expect(listActiveCards(file)).toEqual([])

    // Unignore restores it immediately, no rescan required.
    file = unignoreInFile(file, 'ABC-1')
    expect(listActiveCards(file).map((c) => c.issueKey)).toEqual(['ABC-1'])
  })

  it('dismiss uses the caller-supplied fallback for a key with no scanned card', () => {
    const file = dismissInFile(emptyWhatTaskTodayStore(), 'ZZZ-1', {
      title: 'Fetched from Jira',
      url: 'https://jira/ZZZ-1'
    })
    expect(file.ignored['ZZZ-1']).toEqual({
      issueKey: 'ZZZ-1',
      title: 'Fetched from Jira',
      url: 'https://jira/ZZZ-1'
    })
  })

  it('prune drops cards no longer live but keeps ignored keys', () => {
    let file = upsertCardInFile(emptyWhatTaskTodayStore(), card({ issueKey: 'A-1' }))
    file = upsertCardInFile(file, card({ issueKey: 'A-2' }))
    file = dismissInFile(file, 'A-3', { title: 'Third', url: 'https://jira/A-3' })
    file = pruneCardsInFile(file, ['A-1'])
    expect(Object.keys(file.cards)).toEqual(['A-1'])
    expect(file.ignored['A-3']).toBeDefined()
  })

  it('lists active cards newest-first excluding ignored', () => {
    let file = upsertCardInFile(
      emptyWhatTaskTodayStore(),
      card({ issueKey: 'A-1', generatedAt: 1 })
    )
    file = upsertCardInFile(file, card({ issueKey: 'A-2', generatedAt: 5 }))
    expect(listActiveCards(file).map((c) => c.issueKey)).toEqual(['A-2', 'A-1'])
  })

  it('lists ignored entries sorted by key', () => {
    let file = dismissInFile(emptyWhatTaskTodayStore(), 'B-1', {
      title: 'B',
      url: 'https://jira/B-1'
    })
    file = dismissInFile(file, 'A-1', { title: 'A', url: 'https://jira/A-1' })
    expect(listIgnoredEntries(file).map((entry) => entry.issueKey)).toEqual(['A-1', 'B-1'])
  })

  it('clear wipes synced cards but keeps ignored entries', () => {
    let file = upsertCardInFile(emptyWhatTaskTodayStore(), card({ issueKey: 'A-1' }))
    file = dismissInFile(file, 'A-2', { title: 'Ignored', url: 'https://jira/A-2' })
    file = clearCardsInFile(file)
    expect(file.cards).toEqual({})
    expect(file.ignored['A-2']).toBeDefined()
  })
})
