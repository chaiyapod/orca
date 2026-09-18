// Summarizer settings (model choice) at ~/.orca/what-task-today/settings.json.
// Non-secret; plain write like the summary store.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  emptyWhatTaskTodaySettings,
  type WhatTaskTodaySettings
} from '../../shared/what-task-today-types'
import { migrateLegacyFile, whatTaskTodayDataDir } from './data-dir'

function settingsPath(): string {
  const path = join(whatTaskTodayDataDir(), 'settings.json')
  migrateLegacyFile(join(homedir(), '.orca', 'what-task-today-settings.json'), path)
  return path
}

function normalizeStatusNames(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') && value.length > 0
    ? value
    : null
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
    const statusNames =
      parsed && typeof parsed === 'object' && 'statusNames' in parsed
        ? normalizeStatusNames(parsed.statusNames)
        : null
    const prePrompt =
      parsed &&
      typeof parsed === 'object' &&
      'prePrompt' in parsed &&
      typeof parsed.prePrompt === 'string' &&
      parsed.prePrompt.trim()
        ? parsed.prePrompt
        : null
    return { model, statusNames, prePrompt }
  } catch {
    return emptyWhatTaskTodaySettings()
  }
}

export function saveWhatTaskTodaySettings(settings: WhatTaskTodaySettings): void {
  const model = typeof settings.model === 'string' && settings.model.trim() ? settings.model : null
  const statusNames = normalizeStatusNames(settings.statusNames)
  const prePrompt =
    typeof settings.prePrompt === 'string' && settings.prePrompt.trim() ? settings.prePrompt : null
  writeFileSync(settingsPath(), JSON.stringify({ model, statusNames, prePrompt }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}
