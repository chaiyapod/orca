import React from 'react'
import { RefreshCw } from 'lucide-react'
import type { WhatTaskTodayIgnoredEntry } from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

// Fixed Key column, flexible Title, fixed action column — shared by the
// header row and every data row so a native `overflow-y-auto` scroll on just
// the rows (header sits outside it) never misaligns the columns.
const IGNORED_GRID_COLUMNS = 'grid-cols-[140px_1fr_100px]'

export function IgnoredCardsSection(): React.JSX.Element {
  const [ignored, setIgnored] = React.useState<WhatTaskTodayIgnoredEntry[]>([])
  const [input, setInput] = React.useState('')
  const [adding, setAdding] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setIgnored(await window.api.whatTaskToday.listIgnored())
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const handleAdd = React.useCallback(async () => {
    const keys = [
      ...new Set(
        input
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((k) => k.toUpperCase())
      )
    ]
    if (keys.length === 0 || adding) {
      return
    }
    setAdding(true)
    try {
      // A key that was never scanned needs a one-time Jira lookup for its
      // title (bounded by a timeout in main) — a card that was already
      // scanned resolves instantly with no Jira call.
      await Promise.all(keys.map((issueKey) => window.api.whatTaskToday.dismiss({ issueKey })))
      setInput('')
      await refresh()
    } finally {
      setAdding(false)
    }
  }, [input, adding, refresh])

  const handleRemove = React.useCallback(
    async (key: string) => {
      await window.api.whatTaskToday.unignore({ issueKey: key })
      await refresh()
    },
    [refresh]
  )

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="flex-none space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">
            {translate('auto.components.whatTaskToday.ignoredTitle', 'Ignored cards')}
            {ignored.length > 0 ? ` (${ignored.length})` : ''}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {translate(
              'auto.components.whatTaskToday.ignoredDescription',
              'These Jira cards are hidden from What Task Today. Remove one to bring it back. Separate multiple keys with a comma or space.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleAdd()
              }
            }}
            disabled={adding}
            placeholder="ABC-123, ABC-124"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding}>
            {adding ? <RefreshCw className="size-4 animate-spin" /> : null}
            {adding
              ? translate('auto.components.whatTaskToday.ignoreAdding', 'Looking up…')
              : translate('auto.components.whatTaskToday.ignoreAdd', 'Ignore')}
          </Button>
        </div>
      </div>
      {ignored.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.whatTaskToday.ignoreEmpty', 'No ignored cards.')}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
          <div
            className={cn(
              'grid h-9 flex-none items-center border-b border-border bg-muted/35 px-3 text-xs font-medium text-muted-foreground',
              IGNORED_GRID_COLUMNS
            )}
          >
            <span>{translate('auto.components.whatTaskToday.colKey', 'Key')}</span>
            <span>{translate('auto.components.whatTaskToday.colTitle', 'Title')}</span>
            <span />
          </div>
          <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
            {ignored.map((entry) => (
              <div
                key={entry.issueKey}
                className={cn(
                  'grid items-center border-b border-border px-3 py-2 text-sm last:border-b-0',
                  IGNORED_GRID_COLUMNS
                )}
              >
                <span className="whitespace-nowrap text-muted-foreground">
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {entry.issueKey}
                    </a>
                  ) : (
                    entry.issueKey
                  )}
                </span>
                <span className="min-w-0 truncate text-foreground">
                  {entry.title || (
                    <span className="text-muted-foreground">
                      {translate(
                        'auto.components.whatTaskToday.ignoreTitleUnavailable',
                        'Title unavailable'
                      )}
                    </span>
                  )}
                </span>
                <span className="justify-self-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRemove(entry.issueKey)}
                  >
                    {translate('auto.components.whatTaskToday.ignoreRemove', 'Remove')}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
