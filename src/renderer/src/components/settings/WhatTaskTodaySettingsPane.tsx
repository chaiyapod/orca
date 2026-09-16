import React from 'react'
import { RefreshCw } from 'lucide-react'
import type {
  WhatTaskTodayIgnoredEntry,
  WhatTaskTodayLogEntry
} from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useConfirmationDialog } from '@/components/confirmation-dialog-context'
import { translate } from '@/i18n/i18n'

export function WhatTaskTodaySettingsPane(): React.JSX.Element {
  return (
    <div className="divide-y divide-border">
      <McpConfigSection />
      <IgnoredCardsSection />
      <ErrorLogSection />
      <ClearDataSection />
    </div>
  )
}

function McpConfigSection(): React.JSX.Element {
  const [value, setValue] = React.useState('')
  const [status, setStatus] = React.useState<string | null>(null)

  React.useEffect(() => {
    void window.api.whatTaskToday.getMcpConfig().then((content) => {
      if (content) {
        setValue(content)
      }
    })
  }, [])

  const handleSave = React.useCallback(async () => {
    const result = await window.api.whatTaskToday.setMcpConfig({ content: value })
    setStatus(
      result.ok
        ? translate('auto.components.settings.whatTaskToday.mcpSaved', 'Saved.')
        : result.error
    )
  }, [value])

  return (
    <section className="space-y-3 py-5 first:pt-0">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {translate(
            'auto.components.settings.whatTaskToday.mcpConfigTitle',
            'Codebase MCP config'
          )}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.mcpConfigDescription',
            'JSON in .mcp.json shape ({ "mcpServers": { … } }). Point it at your codebases so the summarizer can inspect them.'
          )}
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder={'{\n  "mcpServers": {}\n}'}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave}>
          {translate('auto.components.settings.whatTaskToday.mcpSave', 'Save')}
        </Button>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
    </section>
  )
}

function IgnoredCardsSection(): React.JSX.Element {
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
          {translate('auto.components.settings.whatTaskToday.ignoredTitle', 'Ignored cards')}
          {ignored.length > 0 ? ` (${ignored.length})` : ''}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.ignoredDescription',
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
            ? translate('auto.components.settings.whatTaskToday.ignoreAdding', 'Looking up…')
            : translate('auto.components.settings.whatTaskToday.ignoreAdd', 'Ignore')}
        </Button>
      </div>
      {ignored.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.settings.whatTaskToday.ignoreEmpty', 'No ignored cards.')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/35 text-muted-foreground">
              <tr className="h-9">
                <th className="px-3 text-left font-medium">
                  {translate('auto.components.settings.whatTaskToday.colKey', 'Key')}
                </th>
                <th className="px-3 text-left font-medium">
                  {translate('auto.components.settings.whatTaskToday.colTitle', 'Title')}
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
                          'auto.components.settings.whatTaskToday.ignoreTitleUnavailable',
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
                      {translate('auto.components.settings.whatTaskToday.ignoreRemove', 'Remove')}
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

function formatLogTimestamp(at: number): string {
  return new Date(at).toLocaleString()
}

function ErrorLogSection(): React.JSX.Element {
  const [entries, setEntries] = React.useState<WhatTaskTodayLogEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await window.api.whatTaskToday.getLog())
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <section className="space-y-3 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">
            {translate('auto.components.settings.whatTaskToday.errorLogTitle', 'Error log')}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {translate(
              'auto.components.settings.whatTaskToday.errorLogDescription',
              'Recent scan and re-plan failures, most recent first.'
            )}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          {translate('auto.components.settings.whatTaskToday.errorLogRefresh', 'Refresh')}
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.settings.whatTaskToday.errorLogEmpty', 'No errors recorded.')}
        </p>
      ) : (
        <ul className="scrollbar-sleek max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-3">
          {entries.map((entry) => (
            <li
              key={`${entry.at}:${entry.message}`}
              className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <span className="mr-2 font-mono text-[10px] text-destructive/70">
                {formatLogTimestamp(entry.at)}
              </span>
              <span className="whitespace-pre-wrap">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ClearDataSection(): React.JSX.Element {
  const confirm = useConfirmationDialog()
  const [status, setStatus] = React.useState<string | null>(null)

  const handleClear = React.useCallback(async () => {
    const confirmed = await confirm({
      title: translate(
        'auto.components.settings.whatTaskToday.clearDataTitle',
        'Clear synced Jira data?'
      ),
      description: translate(
        'auto.components.settings.whatTaskToday.clearDataDescription',
        'Removes every summarized card. Ignored cards, MCP config, and the model setting are kept. Run a scan to pull cards again.'
      ),
      confirmLabel: translate('auto.components.settings.whatTaskToday.clearDataConfirm', 'Clear'),
      confirmVariant: 'destructive'
    })
    if (!confirmed) {
      return
    }
    await window.api.whatTaskToday.clearCards()
    setStatus(translate('auto.components.settings.whatTaskToday.clearDataDone', 'Cleared.'))
  }, [confirm])

  return (
    <section className="space-y-3 py-5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {translate('auto.components.settings.whatTaskToday.clearDataSectionTitle', 'Synced data')}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.clearDataSectionDescription',
            'Clear the Jira cards summarized so far. Useful if the local data looks stale or wrong.'
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="destructive" onClick={() => void handleClear()}>
          {translate('auto.components.settings.whatTaskToday.clearDataButton', 'Clear synced data')}
        </Button>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
    </section>
  )
}
