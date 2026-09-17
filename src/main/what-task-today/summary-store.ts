// Disk-backed What Task Today store: ~/.orca/what-task-today/cards.json.
// Non-secret data, so a plain write (matching jira-sites.json) is fine.
// ponytail: single-process cache + plain write; corruption just forces a rescan.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  emptyWhatTaskTodayStore,
  type WhatTaskTodayCard,
  type WhatTaskTodayIgnoredEntry,
  type WhatTaskTodayStoreFile
} from '../../shared/what-task-today-types'
import {
  clearWhatTaskTodayAgentContextFiles,
  deleteWhatTaskTodayAgentContextFile
} from './agent-context-file'
import { migrateLegacyFile, whatTaskTodayDataDir } from './data-dir'
import {
  clearCardsInFile,
  dismissInFile,
  listActiveCards,
  listIgnoredEntries,
  normalizeStoreFile,
  pruneCardsInFile,
  shouldReSummarize,
  unignoreInFile,
  upsertCardInFile
} from './summary-store-logic'

let cached: WhatTaskTodayStoreFile | null = null

function storePath(): string {
  const path = join(whatTaskTodayDataDir(), 'cards.json')
  migrateLegacyFile(join(homedir(), '.orca', 'what-task-today.json'), path)
  return path
}

function readFromDisk(): WhatTaskTodayStoreFile {
  const path = storePath()
  if (!existsSync(path)) {
    return emptyWhatTaskTodayStore()
  }
  try {
    return normalizeStoreFile(JSON.parse(readFileSync(path, { encoding: 'utf-8' })))
  } catch {
    return emptyWhatTaskTodayStore()
  }
}

function getFile(): WhatTaskTodayStoreFile {
  if (!cached) {
    cached = readFromDisk()
  }
  return cached
}

function persist(file: WhatTaskTodayStoreFile): void {
  cached = file
  writeFileSync(storePath(), JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

export function listWhatTaskTodayCards(): WhatTaskTodayCard[] {
  return listActiveCards(getFile())
}

export function shouldReSummarizeCard(issueKey: string, updated: string): boolean {
  return shouldReSummarize(getFile(), issueKey, updated)
}

export function upsertWhatTaskTodayCard(cardValue: WhatTaskTodayCard): void {
  persist(upsertCardInFile(getFile(), cardValue))
}

export function dismissWhatTaskTodayCard(
  issueKey: string,
  fallback?: { title: string; url: string }
): void {
  persist(dismissInFile(getFile(), issueKey, fallback))
}

export function hasWhatTaskTodayCard(issueKey: string): boolean {
  return Object.hasOwn(getFile().cards, issueKey)
}

export function unignoreWhatTaskTodayCard(issueKey: string): void {
  persist(unignoreInFile(getFile(), issueKey))
}

export function pruneWhatTaskTodayCards(liveKeys: readonly string[]): void {
  const before = getFile()
  const after = pruneCardsInFile(before, liveKeys)
  persist(after)
  for (const issueKey of Object.keys(before.cards)) {
    if (!Object.hasOwn(after.cards, issueKey)) {
      deleteWhatTaskTodayAgentContextFile(issueKey)
    }
  }
}

export function getWhatTaskTodayAgentContext(issueKey: string): string | null {
  return getFile().cards[issueKey]?.agentContext ?? null
}

export function listWhatTaskTodayIgnored(): WhatTaskTodayIgnoredEntry[] {
  return listIgnoredEntries(getFile())
}

export function clearWhatTaskTodayCards(): void {
  persist(clearCardsInFile(getFile()))
  clearWhatTaskTodayAgentContextFiles()
}
