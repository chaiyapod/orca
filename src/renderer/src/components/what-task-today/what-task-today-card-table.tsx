import React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import { cn } from '@/lib/utils'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { translate } from '@/i18n/i18n'

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

// Fixed-width Key/Updated columns, flexible Title — shared by the header row
// and every data row so a native `overflow-y-auto` scroll on just the rows
// (header sits outside it) never misaligns the columns.
const CARD_GRID_COLUMNS = 'grid-cols-[110px_1fr_140px]'

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
            <span className="whitespace-nowrap text-muted-foreground">
              {formatUiRelativeTimeFromDate(card.updated)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
