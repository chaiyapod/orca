// Stores the raw `.mcp.json`-shaped config the summarizer passes to `claude -p`
// via --mcp-config. Encrypted at rest (MCP env blocks commonly hold API keys).

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { inspectMcpConfigContent, MCP_CONFIG_CANDIDATES } from '../../shared/mcp-config'
import type { WhatTaskTodayMcpConfigSaveResult } from '../../shared/what-task-today-types'
import { readStoredCredentialToken, writeEncryptedCredential } from '../integration-credential-file'
import { migrateLegacyFile, whatTaskTodayDataDir } from './data-dir'

// The `.mcp.json` workspace shape ({ "mcpServers": {...} }).
const WORKSPACE_CANDIDATE = MCP_CONFIG_CANDIDATES[0]

function configPath(): string {
  const path = join(whatTaskTodayDataDir(), 'mcp.enc')
  migrateLegacyFile(join(homedir(), '.orca', 'what-task-today-mcp.enc'), path)
  return path
}

export function readWhatTaskTodayMcpConfig(): string | null {
  const path = configPath()
  if (!existsSync(path)) {
    return null
  }
  try {
    return readStoredCredentialToken('MCP', readFileSync(path))
  } catch {
    return null
  }
}

export function saveWhatTaskTodayMcpConfig(content: string): WhatTaskTodayMcpConfigSaveResult {
  const inspection = inspectMcpConfigContent(WORKSPACE_CANDIDATE, content)
  if (inspection.status === 'invalid') {
    return { ok: false, error: inspection.error ?? 'Invalid MCP config.' }
  }
  writeEncryptedCredential('MCP', configPath(), content)
  return { ok: true }
}
