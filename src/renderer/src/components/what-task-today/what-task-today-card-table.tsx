import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import { cn } from '@/lib/utils'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { translate } from '@/i18n/i18n'
import { getJiraStatusTone } from '@/components/task-page-jira-status-tone'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Fixed-width Key/Status/Updated columns, flexible Title — shared by every
// row so a native `overflow-y-auto` scroll never misaligns the columns.
const CARD_GRID_COLUMNS = 'grid-cols-[110px_1fr_150px_140px]'

// Same category order What Task Today scans in ("new" before "indeterminate";
// "done" never appears since a scan neither summarizes nor detects it).
const STATUS_CATEGORY_RANK: Record<string, number> = { new: 0, indeterminate: 1, done: 2 }

type CardStatusSection = {
  key: string
  label: string
  categoryRank: number
  cards: WhatTaskTodayCard[]
}

// Same grouping shape as the Task page's Jira list
// (groupJiraIssuesByStatus in task-page-jira-issue-list.tsx), keyed by exact
// status name — sorted by category (To Do before In Progress) since a board
// column order isn't available here.
function groupCardsByStatus(cards: readonly WhatTaskTodayCard[]): CardStatusSection[] {
  const sections = new Map<string, CardStatusSection>()
  for (const card of cards) {
    const label = card.statusName || translate('auto.components.whatTaskToday.colStatus', 'Status')
    const key = `status:${label}`
    const existing = sections.get(key)
    if (existing) {
      existing.cards.push(card)
    } else {
      sections.set(key, {
        key,
        label,
        categoryRank: STATUS_CATEGORY_RANK[card.statusCategory] ?? 99,
        cards: [card]
      })
    }
  }
  return [...sections.values()].sort((a, b) =>
    a.categoryRank === b.categoryRank
      ? a.label.localeCompare(b.label)
      : a.categoryRank - b.categoryRank
  )
}

function CardRow({
  card,
  onSelect
}: {
  card: WhatTaskTodayCard
  onSelect: (card: WhatTaskTodayCard) => void
}): React.JSX.Element {
  return (
    <div
      onClick={() => onSelect(card)}
      className={cn(
        'grid cursor-pointer items-center px-4 py-3 text-sm hover:bg-muted/50',
        CARD_GRID_COLUMNS
      )}
    >
      <span className="whitespace-nowrap text-muted-foreground">{card.issueKey}</span>
      <span className="min-w-0 truncate text-foreground">{card.title}</span>
      <span className="min-w-0">
        {card.statusName ? (
          <span
            className={cn(
              'inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              getJiraStatusTone(card.statusCategory)
            )}
          >
            <span className="truncate">{card.statusName}</span>
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap text-muted-foreground">
        {formatUiRelativeTimeFromDate(card.updated)}
      </span>
    </div>
  )
}

export function CardTable({
  cards,
  onSelect
}: {
  cards: WhatTaskTodayCard[]
  onSelect: (card: WhatTaskTodayCard) => void
}): React.JSX.Element {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(() => new Set())

  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-border">
        <p className="text-sm text-muted-foreground">
          {translate(
            'auto.components.whatTaskToday.empty',
            'No summarized cards yet. Run a scan to pull your Jira tasks.'
          )}
        </p>
      </div>
    )
  }

  const sections = groupCardsByStatus(cards)
  return (
    <div className="scrollbar-sleek h-full overflow-y-auto rounded-md border border-border">
      <div className="divide-y divide-border/50">
        {sections.map((section) => {
          const open = !collapsedGroups.has(section.key)
          return (
            <Collapsible
              key={section.key}
              open={open}
              onOpenChange={(nextOpen) => {
                setCollapsedGroups((current) => {
                  const next = new Set(current)
                  if (nextOpen) {
                    next.delete(section.key)
                  } else {
                    next.add(section.key)
                  }
                  return next
                })
              }}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-start gap-2 bg-muted/35 px-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {open ? (
                    <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                    {section.label}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {section.cards.length}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="divide-y divide-border/50 border-t border-border/50">
                  {section.cards.map((card) => (
                    <CardRow key={card.issueKey} card={card} onSelect={onSelect} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
