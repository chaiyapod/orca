// Writes a card's pre-generated implementation plan to disk so the terminal
// prompt can point at a short file path instead of pasting the whole plan.
// Deleted alongside the card by summary-store.ts once the card is pruned or
// cleared (dismiss keeps the card's own data around for unignore, so it
// keeps this file too).
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { whatTaskTodayDataDir } from './data-dir'
import { getWhatTaskTodayAgentContext } from './summary-store'

function contextDir(): string {
  return join(whatTaskTodayDataDir(), 'context')
}

function sanitizeIssueKeyForFilename(issueKey: string): string {
  return issueKey.replace(/[^A-Za-z0-9-]/g, '_')
}

function contextFilePath(issueKey: string): string {
  return join(contextDir(), `${sanitizeIssueKeyForFilename(issueKey)}.md`)
}

export function writeWhatTaskTodayAgentContextFile(
  issueKey: string
): { ok: true; path: string } | { ok: false; error: string } {
  const agentContext = getWhatTaskTodayAgentContext(issueKey)
  if (!agentContext) {
    return { ok: false, error: `No agent context saved for ${issueKey}.` }
  }
  const dir = contextDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = contextFilePath(issueKey)
  writeFileSync(path, agentContext, { encoding: 'utf-8', mode: 0o600 })
  return { ok: true, path }
}

export function deleteWhatTaskTodayAgentContextFile(issueKey: string): void {
  rmSync(contextFilePath(issueKey), { force: true })
}

export function clearWhatTaskTodayAgentContextFiles(): void {
  rmSync(contextDir(), { recursive: true, force: true })
}
