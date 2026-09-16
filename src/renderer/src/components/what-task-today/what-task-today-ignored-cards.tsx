import React from 'react'
import { RefreshCw } from 'lucide-react'
import type { WhatTaskTodayIgnoredEntry } from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

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
    const key = input.trim().toUpperCase()
    if (!key || adding) {
      return
    }
    setAdding(true)
    try {
      // A key that was never scanned needs a one-time Jira lookup for its
      // title (bounded by a timeout in main) — a card that was already
      // scanned resolves instantly with no Jira call.
      await window.api.whatTaskToday.dismiss({ issueKey: key })
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
    <section className="space-y-3 py-5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {translate('auto.components.whatTaskToday.ignoredTitle', 'Ignored cards')}
          {ignored.length > 0 ? ` (${ignored.length})` : ''}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(
            'auto.components.whatTaskToday.ignoredDescription',
            'These Jira cards are hidden from What Task Today. Remove one to bring it back.'
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
          placeholder="ABC-123"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
        />
        <Button size="sm" onClick={handleAdd} disabled={adding}>
          {adding ? <RefreshCw className="size-4 animate-spin" /> : null}
          {adding
            ? translate('auto.components.whatTaskToday.ignoreAdding', 'Looking up…')
            : translate('auto.components.whatTaskToday.ignoreAdd', 'Ignore')}
        </Button>
      </div>
      {ignored.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.whatTaskToday.ignoreEmpty', 'No ignored cards.')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/35 text-muted-foreground">
              <tr className="h-9">
                <th className="px-3 text-left font-medium">
                  {translate('auto.components.whatTaskToday.colKey', 'Key')}
                </th>
                <th className="px-3 text-left font-medium">
                  {translate('auto.components.whatTaskToday.colTitle', 'Title')}
                </th>
                <th className="w-px px-3 text-left font-medium" />
              </tr>
            </thead>
            <tbody>
              {ignored.map((entry) => (
                <tr key={entry.issueKey} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
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
                  </td>
                  <td className="px-3 py-2 align-top text-foreground">
                    {entry.title || (
                      <span className="text-muted-foreground">
                        {translate(
                          'auto.components.whatTaskToday.ignoreTitleUnavailable',
                          'Title unavailable'
                        )}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 align-top">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleRemove(entry.issueKey)}
                    >
                      {translate('auto.components.whatTaskToday.ignoreRemove', 'Remove')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
