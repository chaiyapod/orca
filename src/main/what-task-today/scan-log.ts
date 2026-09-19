// In-memory rolling log of What Task Today errors (scan + re-plan failures),
// so the Settings pane can show what went wrong without the user having to
// stay on the Cards page while it happens. Cleared on app restart — that's
// fine, a fresh scan repopulates it.

import type { WhatTaskTodayLogEntry } from '../../shared/what-task-today-types'

const MAX_LOG_ENTRIES = 50
let log: WhatTaskTodayLogEntry[] = []

export function recordWhatTaskTodayLogEntries(messages: readonly string[]): void {
  if (messages.length === 0) {
    return
  }
  const at = Date.now()
  log = [...messages.map((message) => ({ at, message })), ...log].slice(0, MAX_LOG_ENTRIES)
}

export function getWhatTaskTodayLog(): WhatTaskTodayLogEntry[] {
  return log
}
