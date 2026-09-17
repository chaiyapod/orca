import React from 'react'
import { FolderOpen, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { WhatTaskTodayLogEntry } from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useConfirmationDialog } from '@/components/confirmation-dialog-context'
import { translate } from '@/i18n/i18n'
import { StatusCategoryFilter } from './what-task-today-status-filter'

export function WhatTaskTodaySettingsPane(): React.JSX.Element {
  return (
    <div className="divide-y divide-border">
      <ScanConditionsSection />
      <PrePromptSection />
      <McpConfigSection />
      <ErrorLogSection />
      <ClearDataSection />
    </div>
  )
}

function ScanConditionsSection(): React.JSX.Element {
  return (
    <section className="space-y-3 py-5 first:pt-0">
      <h3 className="text-sm font-medium">
        {translate(
          'auto.components.settings.whatTaskToday.scanConditionsTitle',
          'What a scan pulls'
        )}
      </h3>
      <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-muted-foreground">
        <li>
          {translate(
            'auto.components.settings.whatTaskToday.scanConditionAssigned',
            'Assigned to you (assignee = currentUser())'
          )}
        </li>
        <li>
          {translate(
            'auto.components.settings.whatTaskToday.scanConditionUnresolved',
            'Not resolved (resolution = Unresolved)'
          )}
        </li>
        <li>
          {translate(
            'auto.components.settings.whatTaskToday.scanConditionIgnored',
            'Not on your Ignored list'
          )}
        </li>
        <li>
          {translate(
            'auto.components.settings.whatTaskToday.scanConditionOrder',
            'Newest updated first, capped at 50 cards per scan'
          )}
        </li>
      </ul>
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.scanStatusFilterTitle',
            'Include statuses'
          )}
        </p>
        <StatusCategoryFilter />
      </div>
    </section>
  )
}

function PrePromptSection(): React.JSX.Element {
  const [value, setValue] = React.useState('')
  const [status, setStatus] = React.useState<string | null>(null)

  React.useEffect(() => {
    void window.api.whatTaskToday.getSettings().then((settings) => {
      setValue(settings.prePrompt ?? '')
    })
  }, [])

  const handleSave = React.useCallback(async () => {
    await window.api.whatTaskToday.setSettings({ prePrompt: value.trim() ? value : null })
    setStatus(translate('auto.components.settings.whatTaskToday.prePromptSaved', 'Saved.'))
  }, [value])

  return (
    <section className="space-y-3 py-5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {translate('auto.components.settings.whatTaskToday.prePromptTitle', 'Extra instructions')}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.prePromptDescription',
            'Prepended to every summarize prompt, before the per-card instructions — e.g. house conventions or which repos to prefer.'
          )}
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={translate(
          'auto.components.settings.whatTaskToday.prePromptPlaceholder',
          'e.g. Prefer the orca-backend repo for API changes; flag anything touching auth for manual review.'
        )}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => void handleSave()}>
          {translate('auto.components.settings.whatTaskToday.prePromptSave', 'Save')}
        </Button>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
    </section>
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

function formatLogTimestamp(at: number): string {
  return new Date(at).toLocaleString()
}

// Why: getLog() is an in-memory read that resolves in well under a frame —
// without a floor, the spinner flips true→false before the browser ever
// paints it, so a click that did work looks like it did nothing.
const MIN_ERROR_LOG_REFRESH_SPINNER_MS = 400

function ErrorLogSection(): React.JSX.Element {
  const [entries, setEntries] = React.useState<WhatTaskTodayLogEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    const startedAt = Date.now()
    try {
      setEntries(await window.api.whatTaskToday.getLog())
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_ERROR_LOG_REFRESH_SPINNER_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_ERROR_LOG_REFRESH_SPINNER_MS - elapsed)
        )
      }
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

  const handleOpenDataFolder = React.useCallback(async () => {
    const path = await window.api.whatTaskToday.getDataFolderPath()
    const result = await window.api.shell.openInFileManager(path)
    if (!result.ok) {
      toast.error(
        translate(
          'auto.components.settings.whatTaskToday.openDataFolderFailed',
          'Could not open folder'
        )
      )
    }
  }, [])

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
        <Button size="sm" variant="outline" onClick={() => void handleOpenDataFolder()}>
          <FolderOpen className="size-4" />
          {translate('auto.components.settings.whatTaskToday.openDataFolder', 'Open data folder')}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => void handleClear()}>
          {translate('auto.components.settings.whatTaskToday.clearDataButton', 'Clear synced data')}
        </Button>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </div>
    </section>
  )
}
