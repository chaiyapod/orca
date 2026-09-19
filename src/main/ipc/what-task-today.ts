import { ipcMain, Notification } from 'electron'
import type { WhatTaskTodaySettings } from '../../shared/what-task-today-types'
import { writeWhatTaskTodayAgentContextFile } from '../what-task-today/agent-context-file'
import { whatTaskTodayDataDir } from '../what-task-today/data-dir'
import {
  readWhatTaskTodayMcpConfig,
  saveWhatTaskTodayMcpConfig
} from '../what-task-today/mcp-config-store'
import { resolveJiraTitleForKey } from '../what-task-today/ignored-lookup'
import { getWhatTaskTodayLog, recordWhatTaskTodayLogEntries } from '../what-task-today/scan-log'
import {
  clearWhatTaskTodayCards,
  dismissWhatTaskTodayCard,
  getWhatTaskTodayAgentContext,
  hasWhatTaskTodayCard,
  listWhatTaskTodayCards,
  listWhatTaskTodayIgnored,
  unignoreWhatTaskTodayCard
} from '../what-task-today/summary-store'
import {
  readWhatTaskTodaySettings,
  saveWhatTaskTodaySettings
} from '../what-task-today/settings-store'
import { replanWhatTaskTodayCard, scanWhatTaskToday } from '../what-task-today/summarizer'

function normalizeKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// Why: fires from the IPC handler (not the renderer) so a scan triggered
// without the What Task Today page open — e.g. a future scheduled scan —
// still surfaces failures. Plain OS notification: leaving `silent` unset
// plays the system's default sound.
function notifyWhatTaskTodayScanErrors(errors: readonly string[]): void {
  if (errors.length === 0 || !Notification.isSupported()) {
    return
  }
  const title =
    errors.length === 1
      ? 'What Task Today: 1 card failed to summarize'
      : `What Task Today: ${errors.length} cards failed to summarize`
  new Notification({ title, body: errors[0] }).show()
}

/** Registers every `whatTaskToday:*` IPC handler on the main process. */
export function registerWhatTaskTodayHandlers(): void {
  ipcMain.handle('whatTaskToday:scan', async () => {
    try {
      const result = await scanWhatTaskToday()
      recordWhatTaskTodayLogEntries(result.errors)
      notifyWhatTaskTodayScanErrors(result.errors)
      return { ok: true, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      recordWhatTaskTodayLogEntries([message])
      notifyWhatTaskTodayScanErrors([message])
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('whatTaskToday:list', async () => listWhatTaskTodayCards())

  ipcMain.handle('whatTaskToday:replan', async (_event, args: { issueKey: string }) => {
    const key = normalizeKey(args?.issueKey)
    if (!key) {
      return { ok: false, error: 'Issue key is required.' }
    }
    const response = await replanWhatTaskTodayCard(key)
    if (!response.ok) {
      recordWhatTaskTodayLogEntries([`${key}: ${response.error}`])
    }
    return response
  })

  ipcMain.handle('whatTaskToday:getLog', async () => getWhatTaskTodayLog())

  ipcMain.handle('whatTaskToday:clearCards', async () => clearWhatTaskTodayCards())

  ipcMain.handle('whatTaskToday:dismiss', async (_event, args: { issueKey: string }) => {
    const key = normalizeKey(args?.issueKey)
    if (!key) {
      return
    }
    // A card we already scanned carries its own title/url; a manually
    // entered key needs a one-time Jira lookup (bounded by a timeout so a
    // slow/unreachable Jira can't hang this call).
    const fallback = hasWhatTaskTodayCard(key) ? undefined : await resolveJiraTitleForKey(key)
    dismissWhatTaskTodayCard(key, fallback)
  })

  ipcMain.handle('whatTaskToday:unignore', async (_event, args: { issueKey: string }) => {
    const key = normalizeKey(args?.issueKey)
    if (key) {
      unignoreWhatTaskTodayCard(key)
    }
  })

  ipcMain.handle('whatTaskToday:listIgnored', async () => listWhatTaskTodayIgnored())

  ipcMain.handle('whatTaskToday:agentContext', async (_event, args: { issueKey: string }) => {
    const key = normalizeKey(args?.issueKey)
    return key ? getWhatTaskTodayAgentContext(key) : null
  })

  ipcMain.handle(
    'whatTaskToday:writeAgentContextFile',
    async (_event, args: { issueKey: string }) => {
      const key = normalizeKey(args?.issueKey)
      if (!key) {
        return { ok: false, error: 'Issue key is required.' }
      }
      return writeWhatTaskTodayAgentContextFile(key)
    }
  )

  ipcMain.handle('whatTaskToday:getSettings', async () => readWhatTaskTodaySettings())

  ipcMain.handle(
    'whatTaskToday:setSettings',
    async (_event, args: Partial<WhatTaskTodaySettings>) => {
      const current = readWhatTaskTodaySettings()
      saveWhatTaskTodaySettings({
        model: 'model' in args ? (args.model ?? null) : current.model,
        statusNames: 'statusNames' in args ? (args.statusNames ?? null) : current.statusNames,
        prePrompt: 'prePrompt' in args ? (args.prePrompt ?? null) : current.prePrompt
      })
    }
  )

  ipcMain.handle('whatTaskToday:getDataFolderPath', async () => whatTaskTodayDataDir())

  ipcMain.handle('whatTaskToday:getMcpConfig', async () => readWhatTaskTodayMcpConfig())

  ipcMain.handle('whatTaskToday:setMcpConfig', async (_event, args: { content: string }) => {
    if (typeof args?.content !== 'string') {
      return { ok: false, error: 'MCP config content is required.' }
    }
    return saveWhatTaskTodayMcpConfig(args.content)
  })
}
