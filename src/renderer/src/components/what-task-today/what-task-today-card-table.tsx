import React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import { cn } from '@/lib/utils'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { translate } from '@/i18n/i18n'
import { getJiraStatusTone } from '@/components/task-page-jira-status-tone'

type CardSortColumn = 'issueKey' | 'title' | 'updated'
type CardSortState = { column: CardSortColumn; direction: 'asc' | 'desc' }

function sortCards(cards: WhatTaskTodayCard[], sort: CardSortState): WhatTaskTodayCard[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...cards].sort((a, b) => {
    if (sort.column === 'updated') {
      return (new Date(a.updated).getTime() - new Date(b.updated).getTime()) * factor
    }
    return a[sort.column].localeCompare(b[sort.column]) * factor
  })
}

// Fixed-width Key/Status/Updated columns, flexible Title — shared by the
// header row and every data row so a native `overflow-y-auto` scroll on just
// the rows (header sits outside it) never misaligns the columns.
const CARD_GRID_COLUMNS = 'grid-cols-[110px_1fr_150px_140px]'

// Same pill markup + tone mapping as the Jira issue list on the Task page
// (task-page-jira-issue-list.tsx) — reused via getJiraStatusTone.
// Why: always renders a grid cell (even empty) — a conditional `null` here
// would drop a DOM child and shift every column after it out of alignment
// with the header, since the grid template is a fixed column count.
function StatusBadge({ card }: { card: WhatTaskTodayCard }): React.JSX.Element {
  return (
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
  )
}

function SortableColumnHeader({
  label,
  column,
  sort,
  onSort
}: {
  label: string
  column: CardSortColumn
  sort: CardSortState
  onSort: (column: CardSortColumn) => void
}): React.JSX.Element {
  const active = sort.column === column
  const Icon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 text-left hover:text-foreground"
    >
      {label}
      <Icon className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
    </button>
  )
}

export function CardTable({
  cards,
  onSelect
}: {
  cards: WhatTaskTodayCard[]
  onSelect: (card: WhatTaskTodayCard) => void
}): React.JSX.Element {
  const [sort, setSort] = React.useState<CardSortState>({ column: 'updated', direction: 'desc' })

  const handleSort = React.useCallback((column: CardSortColumn) => {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'updated' ? 'desc' : 'asc' }
    )
  }, [])

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
  const sortedCards = sortCards(cards, sort)
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      <div
        className={cn(
          'grid h-10 flex-none items-center border-b border-border bg-muted/35 px-4 text-xs font-medium text-muted-foreground',
          CARD_GRID_COLUMNS
        )}
      >
        <SortableColumnHeader
          label={translate('auto.components.whatTaskToday.colKey', 'Key')}
          column="issueKey"
          sort={sort}
          onSort={handleSort}
        />
        <SortableColumnHeader
          label={translate('auto.components.whatTaskToday.colTitle', 'Title')}
          column="title"
          sort={sort}
          onSort={handleSort}
        />
        <span>{translate('auto.components.whatTaskToday.colStatus', 'Status')}</span>
        <SortableColumnHeader
          label={translate('auto.components.whatTaskToday.colUpdated', 'Updated at')}
          column="updated"
          sort={sort}
          onSort={handleSort}
        />
      </div>
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {sortedCards.map((card) => (
          <div
            key={card.issueKey}
            onClick={() => onSelect(card)}
            className={cn(
              'grid cursor-pointer items-center border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50',
              CARD_GRID_COLUMNS
            )}
          >
            <span className="whitespace-nowrap text-muted-foreground">{card.issueKey}</span>
            <span className="min-w-0 truncate text-foreground">{card.title}</span>
            <StatusBadge card={card} />
            <span className="whitespace-nowrap text-muted-foreground">
              {formatUiRelativeTimeFromDate(card.updated)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
