// Summarizer settings (model choice) at ~/.orca/what-task-today/settings.json.
// Non-secret; plain write like the summary store.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  emptyWhatTaskTodaySettings,
  WHAT_TASK_TODAY_STATUS_CATEGORIES,
  type WhatTaskTodaySettings,
  type WhatTaskTodayStatusCategory
} from '../../shared/what-task-today-types'
import { migrateLegacyFile, whatTaskTodayDataDir } from './data-dir'

function settingsPath(): string {
  const path = join(whatTaskTodayDataDir(), 'settings.json')
  migrateLegacyFile(join(homedir(), '.orca', 'what-task-today-settings.json'), path)
  return path
}

function isStatusCategory(value: unknown): value is WhatTaskTodayStatusCategory {
  return WHAT_TASK_TODAY_STATUS_CATEGORIES.some((category) => category.key === value)
}

function normalizeStatusCategories(value: unknown): WhatTaskTodayStatusCategory[] | null {
  return Array.isArray(value) && value.every(isStatusCategory) && value.length > 0 ? value : null
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
    const statusCategories =
      parsed && typeof parsed === 'object' && 'statusCategories' in parsed
        ? normalizeStatusCategories(parsed.statusCategories)
        : null
    const prePrompt =
      parsed &&
      typeof parsed === 'object' &&
      'prePrompt' in parsed &&
      typeof parsed.prePrompt === 'string' &&
      parsed.prePrompt.trim()
        ? parsed.prePrompt
        : null
    return { model, statusCategories, prePrompt }
  } catch {
    return emptyWhatTaskTodaySettings()
  }
}

export function saveWhatTaskTodaySettings(settings: WhatTaskTodaySettings): void {
  const model = typeof settings.model === 'string' && settings.model.trim() ? settings.model : null
  const statusCategories = normalizeStatusCategories(settings.statusCategories)
  const prePrompt =
    typeof settings.prePrompt === 'string' && settings.prePrompt.trim() ? settings.prePrompt : null
  writeFileSync(settingsPath(), JSON.stringify({ model, statusCategories, prePrompt }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}
