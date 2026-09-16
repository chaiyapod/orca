// Summarizer settings (model choice) at ~/.orca/what-task-today-settings.json.
// Non-secret; plain write like the summary store.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  emptyWhatTaskTodaySettings,
  type WhatTaskTodaySettings
} from '../../shared/what-task-today-types'

function settingsPath(): string {
  return join(homedir(), '.orca', 'what-task-today-settings.json')
}

export function readWhatTaskTodaySettings(): WhatTaskTodaySettings {
  const path = settingsPath()
  if (!existsSync(path)) {
    return emptyWhatTaskTodaySettings()
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
    const model =
      parsed && typeof parsed === 'object' && 'model' in parsed && typeof parsed.model === 'string'
        ? parsed.model
        : null
    return { model }
  } catch {
    return emptyWhatTaskTodaySettings()
  }
}

export function saveWhatTaskTodaySettings(settings: WhatTaskTodaySettings): void {
  const dir = join(homedir(), '.orca')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const model = typeof settings.model === 'string' && settings.model.trim() ? settings.model : null
  writeFileSync(settingsPath(), JSON.stringify({ model }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}
