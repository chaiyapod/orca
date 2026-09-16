import { describe, expect, it } from 'vitest'
import { parseSummary } from './summarizer-prompt'

describe('parseSummary', () => {
  it('splits the two sections', () => {
    const out = [
      '## Summary',
      'human brief here',
      '',
      '## Implementation Plan',
      'step 1',
      'step 2'
    ].join('\n')
    const parsed = parseSummary(out)
    expect(parsed.humanSummary).toBe('human brief here')
    expect(parsed.agentContext).toBe('step 1\nstep 2')
  })

  it('falls back to whole text when the plan header is missing', () => {
    const parsed = parseSummary('just some text')
    expect(parsed.humanSummary).toBe('just some text')
    expect(parsed.agentContext).toBe('just some text')
  })
})
