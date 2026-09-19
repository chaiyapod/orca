import { describe, expect, it } from 'vitest'
import type { JiraIssue } from '../../shared/jira-types'
import { isActionableCard } from './summarizer'

function issue(overrides: Partial<JiraIssue['status']> = {}): JiraIssue {
  return {
    id: '1',
    key: 'ABC-1',
    title: 'Do the thing',
    url: 'https://jira/ABC-1',
    project: { id: '10000', key: 'ABC', name: 'Alpha', siteId: 'site-1' },
    issueType: { id: '1', name: 'Task' },
    status: { id: '1', name: 'To Do', categoryKey: 'new', categoryName: 'To Do', ...overrides },
    labels: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('isActionableCard', () => {
  it('defaults to only "new" category statuses when never configured (statusNames: null)', () => {
    expect(isActionableCard(issue({ categoryKey: 'new', name: 'To Do' }), null)).toBe(true)
    expect(
      isActionableCard(issue({ categoryKey: 'indeterminate', name: 'In Progress' }), null)
    ).toBe(false)
    expect(isActionableCard(issue({ categoryKey: 'done', name: 'Done' }), null)).toBe(false)
  })

  it('matches by exact status name once statusNames is configured, regardless of category', () => {
    const statusNames = ['To Do', 'In Progress/Develop']
    expect(isActionableCard(issue({ categoryKey: 'new', name: 'To Do' }), statusNames)).toBe(true)
    expect(
      isActionableCard(
        issue({ categoryKey: 'indeterminate', name: 'In Progress/Develop' }),
        statusNames
      )
    ).toBe(true)
    // Same category as an allowed name, but a different name — must not leak in.
    expect(
      isActionableCard(issue({ categoryKey: 'indeterminate', name: 'PR/Pair test' }), statusNames)
    ).toBe(false)
  })
})
