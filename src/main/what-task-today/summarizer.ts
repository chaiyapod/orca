// Orchestrates a "Scan now": fetch assigned TODO Jira cards, summarize each
// (headless `claude -p` with the user's MCP config for codebase access), and
// upsert the results into the store. MVP: local host, Claude only, ambient auth.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { JiraIssue } from '../../shared/jira-types'
import {
  resolveWhatTaskTodayStatusCategories,
  type WhatTaskTodayCard,
  type WhatTaskTodayReplanResponse,
  type WhatTaskTodayScanResult
} from '../../shared/what-task-today-types'
import { getIssue } from '../jira/issues'
import { listIssues } from '../jira/jira-issue-search'
import { spawnSourceControlAgent } from '../text-generation/source-control-agent-launch'
import {
  MAX_SOURCE_CONTROL_AGENT_OUTPUT_BYTES,
  SOURCE_CONTROL_GENERATION_TIMEOUT_MS
} from '../text-generation/source-control-generation-limits'
import { readWhatTaskTodayMcpConfig } from './mcp-config-store'
import { readWhatTaskTodaySettings } from './settings-store'
import {
  pruneWhatTaskTodayCards,
  shouldReSummarizeCard,
  upsertWhatTaskTodayCard
} from './summary-store'
import { buildSummarizePrompt, parseSummary } from './summarizer-prompt'

// JQL already filters resolution=Unresolved, which excludes most Done cards
// on its own; this is the actual per-scan status-category gate the user
// configures in Settings (default: To Do + In Progress).
function isActionableCard(issue: JiraIssue, allowedCategories: readonly string[]): boolean {
  return allowedCategories.includes(issue.status?.categoryKey ?? '')
}

export async function scanWhatTaskToday(): Promise<WhatTaskTodayScanResult> {
  const settings = readWhatTaskTodaySettings()
  const allowedCategories = resolveWhatTaskTodayStatusCategories(settings)
  const assigned = await listIssues('assigned', 50)
  const issues = assigned.filter((issue) => isActionableCard(issue, allowedCategories))
  console.log(`[what-task-today] scan: ${assigned.length} assigned, ${issues.length} actionable`)
  const result: WhatTaskTodayScanResult = {
    scanned: issues.length,
    summarized: 0,
    skipped: 0,
    errors: []
  }
  const mcpConfig = readWhatTaskTodayMcpConfig()
  const { model } = settings

  for (const issue of issues) {
    if (!shouldReSummarizeCard(issue.key, issue.updatedAt)) {
      result.skipped += 1
      continue
    }
    try {
      console.log(`[what-task-today] summarizing ${issue.key}… (model: ${model ?? 'default'})`)
      await summarizeIssueIntoCard(issue, mcpConfig, model)
      result.summarized += 1
    } catch (error) {
      result.errors.push(`${issue.key}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Drop cards that no longer match the scan (closed / reassigned / moved on).
  pruneWhatTaskTodayCards(issues.map((issue) => issue.key))
  console.log(
    `[what-task-today] scan done: summarized ${result.summarized}, skipped ${result.skipped}, errors ${result.errors.length}`
  )
  return result
}

// Re-runs the summarizer for a single card regardless of whether Jira's
// `updated` timestamp changed — the user explicitly asked for a fresh plan.
export async function replanWhatTaskTodayCard(
  issueKey: string
): Promise<WhatTaskTodayReplanResponse> {
  try {
    const issue = await getIssue(issueKey)
    if (!issue) {
      return { ok: false, error: `Could not find Jira issue ${issueKey}.` }
    }
    const mcpConfig = readWhatTaskTodayMcpConfig()
    const { model } = readWhatTaskTodaySettings()
    console.log(`[what-task-today] re-planning ${issueKey}… (model: ${model ?? 'default'})`)
    const card = await summarizeIssueIntoCard(issue, mcpConfig, model)
    return { ok: true, card }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function summarizeIssueIntoCard(
  issue: JiraIssue,
  mcpConfig: string | null,
  model: string | null
): Promise<WhatTaskTodayCard> {
  const output = await runClaudeSummarize(buildSummarizePrompt(issue), mcpConfig, model)
  const { humanSummary, agentContext } = parseSummary(output)
  const card: WhatTaskTodayCard = {
    issueKey: issue.key,
    title: issue.title,
    url: issue.url,
    updated: issue.updatedAt,
    humanSummary,
    agentContext,
    generatedAt: Date.now()
  }
  upsertWhatTaskTodayCard(card)
  return card
}

async function runClaudeSummarize(
  prompt: string,
  mcpConfig: string | null,
  model: string | null
): Promise<string> {
  const { args, cleanup } = buildClaudeArgs(mcpConfig, model)
  try {
    return await runClaudePrint(prompt, args)
  } finally {
    cleanup()
  }
}

function buildClaudeArgs(
  mcpConfig: string | null,
  model: string | null
): { args: string[]; cleanup: () => void } {
  const args = ['-p']
  if (model) {
    args.push('--model', model)
  }
  if (!mcpConfig) {
    return { args, cleanup: () => {} }
  }
  const dir = mkdtempSync(join(tmpdir(), 'orca-wtt-mcp-'))
  const configPath = join(dir, 'mcp.json')
  writeFileSync(configPath, mcpConfig, { encoding: 'utf-8', mode: 0o600 })
  // ponytail: skip permission prompts so the headless run can call the codebase
  // MCP tools unattended. Acceptable for a user-configured background summarizer.
  args.push('--mcp-config', configPath, '--dangerously-skip-permissions')
  return { args, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function runClaudePrint(prompt: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnSourceControlAgent({
      binary: 'claude',
      args,
      cwd: tmpdir(),
      env: process.env,
      stdinMode: 'pipe',
      useCwdForNative: true
    })
    let stdout = ''
    let bytes = 0
    let settled = false
    const finish = (fn: () => void): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      fn()
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(() => reject(new Error('Summarizer timed out.')))
    }, SOURCE_CONTROL_GENERATION_TIMEOUT_MS)
    child.stdout?.on('data', (chunk: Buffer) => {
      bytes += chunk.byteLength
      if (bytes > MAX_SOURCE_CONTROL_AGENT_OUTPUT_BYTES) {
        child.kill('SIGKILL')
        finish(() => reject(new Error('Summarizer produced too much output.')))
        return
      }
      stdout += chunk.toString('utf-8')
    })
    child.on('error', (error: Error) => {
      const notFound = 'code' in error && error.code === 'ENOENT'
      finish(() => reject(notFound ? new Error('claude CLI not found on PATH.') : error))
    })
    child.on('close', (code: number | null) =>
      finish(() =>
        code === 0 && stdout.trim()
          ? resolve(stdout)
          : reject(new Error(`claude exited ${code ?? 'null'} with no usable output.`))
      )
    )
    try {
      child.stdin?.end(prompt)
    } catch (error) {
      child.kill('SIGKILL')
      finish(() => reject(error instanceof Error ? error : new Error(String(error))))
    }
  })
}
