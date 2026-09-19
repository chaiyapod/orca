import React from 'react'
import { RefreshCw } from 'lucide-react'
import { buildJiraWorkspaceSource } from '../../../../shared/new-workspace/workspace-source'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { translate } from '@/i18n/i18n'
import { CardDrawer } from './what-task-today-card-drawer'
import { CardTable } from './what-task-today-card-table'
import { IgnoredCardsSection } from './what-task-today-ignored-cards'
import { ModelSelect } from './what-task-today-model-select'

// Module-level (not component state) so an in-flight scan survives the page
// unmounting when the user navigates away and back — otherwise remounting
// resets `scanning` to false and the button becomes clickable mid-scan.
let inFlightScan: ReturnType<(typeof window)['api']['whatTaskToday']['scan']> | null = null
const scanningListeners = new Set<(scanning: boolean) => void>()
function setScanningGlobal(value: boolean): void {
  for (const listener of scanningListeners) {
    listener(value)
  }
}

// Same reasoning as inFlightScan: which issue key is being replanned lives
// outside React state so it survives the drawer closing or the page
// unmounting mid-request — otherwise reopening the drawer (or navigating back)
// shows an idle button while the previous re-plan is still running.
const inFlightReplans = new Set<string>()
const replanListeners = new Set<() => void>()
function notifyReplanListeners(): void {
  for (const listener of replanListeners) {
    listener()
  }
}

export default function WhatTaskTodayPage(): React.JSX.Element {
  const openModal = useAppStore((s) => s.openModal)
  const [cards, setCards] = React.useState<WhatTaskTodayCard[]>([])
  const [selected, setSelected] = React.useState<WhatTaskTodayCard | null>(null)
  const [scanning, setScanning] = React.useState(inFlightScan !== null)
  const [scanError, setScanError] = React.useState<string | null>(null)
  const [scanStatus, setScanStatus] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setCards(await window.api.whatTaskToday.list())
  }, [])

  React.useEffect(() => {
    void reload()
  }, [reload])

  React.useEffect(() => {
    scanningListeners.add(setScanning)
    return () => {
      scanningListeners.delete(setScanning)
    }
  }, [])

  const handleScan = React.useCallback(async () => {
    if (inFlightScan) {
      return
    }
    setScanningGlobal(true)
    setScanError(null)
    setScanStatus(null)
    const scanPromise = window.api.whatTaskToday.scan()
    inFlightScan = scanPromise
    try {
      const response = await scanPromise
      if (!response.ok) {
        setScanError(response.error)
      } else {
        const { scanned, summarized, skipped, errors } = response.result
        setScanStatus(
          scanned === 0
            ? 'No open assigned Jira cards found. Is a Jira site connected in Settings?'
            : `Scanned ${scanned} · summarized ${summarized} · unchanged ${skipped}`
        )
        if (errors.length > 0) {
          setScanError(errors.join('\n'))
        }
      }
      await reload()
    } finally {
      inFlightScan = null
      setScanningGlobal(false)
    }
  }, [reload])

  const handleDismiss = React.useCallback(
    async (issueKey: string) => {
      await window.api.whatTaskToday.dismiss({ issueKey })
      setSelected(null)
      await reload()
    },
    [reload]
  )

  const [replanError, setReplanError] = React.useState<string | null>(null)
  // Bumped by the replan pub-sub purely to force a re-render when
  // inFlightReplans changes, since that Set lives outside React state.
  const [, forceReplanRerender] = React.useReducer((tick: number) => tick + 1, 0)

  React.useEffect(() => {
    replanListeners.add(forceReplanRerender)
    return () => {
      replanListeners.delete(forceReplanRerender)
    }
  }, [])

  const handleReplan = React.useCallback(async (issueKey: string) => {
    if (inFlightReplans.has(issueKey)) {
      return
    }
    inFlightReplans.add(issueKey)
    notifyReplanListeners()
    setReplanError(null)
    try {
      const response = await window.api.whatTaskToday.replan({ issueKey })
      if (!response.ok) {
        setReplanError(response.error)
        return
      }
      setSelected((current) => (current?.issueKey === issueKey ? response.card : current))
      setCards((current) =>
        current.map((existing) => (existing.issueKey === issueKey ? response.card : existing))
      )
    } finally {
      inFlightReplans.delete(issueKey)
      notifyReplanListeners()
    }
  }, [])

  const replanningIssueKey =
    selected && inFlightReplans.has(selected.issueKey) ? selected.issueKey : null

  const handleStart = React.useCallback(
    async (card: WhatTaskTodayCard) => {
      // Why: pasting the full plan into the terminal prompt is unreadable for
      // long plans — write it to disk and point the agent at the file instead.
      const fileResult = card.agentContext
        ? await window.api.whatTaskToday.writeAgentContextFile({ issueKey: card.issueKey })
        : null
      const renderedText = fileResult?.ok
        ? `Implementation plan for ${card.issueKey} is saved at:\n${fileResult.path}\n\nRead it before starting.`
        : null
      const linkedWorkItem = {
        ...buildJiraWorkspaceSource({ key: card.issueKey, title: card.title, url: card.url }),
        ...(renderedText
          ? {
              linkedContext: {
                provider: 'jira' as const,
                version: 1 as const,
                renderedText
              }
            }
          : {})
      }
      openModal('new-workspace-composer', {
        linkedWorkItem,
        prefilledName: `${card.issueKey} ${card.title}`,
        telemetrySource: 'sidebar'
      })
      setSelected(null)
    },
    [openModal]
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-background pt-5 text-foreground md:pt-6">
      <header className="flex shrink-0 items-center gap-3 px-3 pb-3 md:px-5">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-8">
            {translate('auto.components.whatTaskToday.title', 'What Task Today')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.whatTaskToday.subtitle',
              'Your assigned Jira cards, summarized and ready to start.'
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ModelSelect />
          <Button size="sm" onClick={handleScan} disabled={scanning}>
            <RefreshCw className={scanning ? 'size-4 animate-spin' : 'size-4'} />
            {scanning
              ? translate('auto.components.whatTaskToday.scanning', 'Analyzing')
              : translate('auto.components.whatTaskToday.scan', 'Analyze')}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="cards" className="min-h-0 flex-1">
        <TabsList className="mx-3 w-fit md:mx-5">
          <TabsTrigger value="cards">
            {translate('auto.components.whatTaskToday.cardsTab', 'Cards')}
          </TabsTrigger>
          <TabsTrigger value="ignored">
            {translate('auto.components.whatTaskToday.ignoredTab', 'Ignored')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="flex min-h-0 flex-col">
          {scanStatus || scanError ? (
            <div className="flex w-full flex-col gap-2 px-3 pt-3 md:px-5">
              {scanStatus ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {scanStatus}
                </p>
              ) : null}
              {scanError ? (
                <p className="whitespace-pre-wrap rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {scanError}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 px-3 py-3 md:px-5">
            <CardTable cards={cards} onSelect={setSelected} />
          </div>
        </TabsContent>

        <TabsContent value="ignored" className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 px-3 py-3 md:px-5">
            <IgnoredCardsSection />
          </div>
        </TabsContent>
      </Tabs>

      <CardDrawer
        card={selected}
        onClose={() => setSelected(null)}
        onStart={handleStart}
        onDismiss={handleDismiss}
        onReplan={handleReplan}
        replanning={replanningIssueKey !== null}
        replanError={replanError}
      />
    </main>
  )
}
