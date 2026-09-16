// Pure prompt construction + response parsing for the What Task Today summarizer.
// Kept free of I/O so the prompt contract and the parser are unit-tested together.

import type { JiraIssue } from '../../shared/jira-types'

// The two section headers the model must emit; the parser splits on them.
const SUMMARY_HEADER = '## Summary'
const PLAN_HEADER = '## Implementation Plan'

export function buildSummarizePrompt(issue: JiraIssue): string {
  const description = issue.description?.trim() || '(no description provided)'
  return [
    'You are triaging a Jira card for an engineer who will pick it up tomorrow.',
    'Use the available MCP tools to inspect the relevant codebase(s) before answering.',
    '',
    `Card: ${issue.key} — ${issue.title}`,
    `Status: ${issue.status?.name ?? 'unknown'}`,
    `URL: ${issue.url}`,
    '',
    'Description:',
    description,
    '',
    'Respond in GitHub-flavored markdown with EXACTLY these two sections and nothing else:',
    '',
    `${SUMMARY_HEADER}`,
    'A short, scannable brief: what the card asks for, which area/module it impacts,',
    'and a rough plan as 3-6 bullets. Optimize for a human reading it in the morning.',
    '',
    `${PLAN_HEADER}`,
    'A detailed implementation plan for an AI agent to execute: concrete requirements,',
    'the specific files/modules involved (from your MCP inspection), and ordered steps.',
    'This block is injected verbatim as the agent’s starting context, so be precise.'
  ].join('\n')
}

export type ParsedSummary = { humanSummary: string; agentContext: string }

// Splits the model output into the two sections. Falls back to putting the whole
// text in both halves if the headers are missing, so a card is never lost.
export function parseSummary(output: string): ParsedSummary {
  const planIndex = output.indexOf(PLAN_HEADER)
  if (planIndex === -1) {
    const trimmed = output.trim()
    return { humanSummary: trimmed, agentContext: trimmed }
  }
  const summaryStart = output.indexOf(SUMMARY_HEADER)
  const humanRaw =
    summaryStart === -1
      ? output.slice(0, planIndex)
      : output.slice(summaryStart + SUMMARY_HEADER.length, planIndex)
  const agentRaw = output.slice(planIndex + PLAN_HEADER.length)
  return { humanSummary: humanRaw.trim(), agentContext: agentRaw.trim() }
}
