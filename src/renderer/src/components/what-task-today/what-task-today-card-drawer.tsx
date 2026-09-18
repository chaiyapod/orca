import React from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { translate } from '@/i18n/i18n'

export function CardDrawer({
  card,
  onClose,
  onStart,
  onDismiss,
  onReplan,
  replanning,
  replanError
}: {
  card: WhatTaskTodayCard | null
  onClose: () => void
  onStart: (card: WhatTaskTodayCard) => void
  onDismiss: (issueKey: string) => void
  // Whether *this* card's re-plan is in flight is tracked by the parent
  // (module-level state) so it survives the drawer closing/reopening.
  onReplan: (issueKey: string) => void
  replanning: boolean
  replanError: string | null
}): React.JSX.Element {
  return (
    <Sheet open={card !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        {card ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <a
                  href={card.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
                >
                  {card.issueKey}
                  <ExternalLink className="size-3" />
                </a>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {card.title}
                </h2>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={replanning}
                  onClick={() => onReplan(card.issueKey)}
                >
                  <RefreshCw className={replanning ? 'size-4 animate-spin' : 'size-4'} />
                  {replanning
                    ? translate('auto.components.whatTaskToday.replanning', 'Re-planning…')
                    : translate('auto.components.whatTaskToday.replan', 'Re-plan')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(card.issueKey)}>
                  {translate('auto.components.whatTaskToday.ignoreButton', 'Ignore')}
                </Button>
                <Button size="sm" onClick={() => onStart(card)}>
                  {translate('auto.components.whatTaskToday.start', 'Start')}
                </Button>
              </div>
            </div>
            {replanError ? (
              <p className="whitespace-pre-wrap border-b border-border bg-destructive/10 px-5 py-2 text-sm text-destructive">
                {replanError}
              </p>
            ) : null}
            <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {card.humanSummary ? (
                <CommentMarkdown content={card.humanSummary} variant="document" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {translate(
                    'auto.components.whatTaskToday.notSummarizedYet',
                    'Not summarized yet — detected while in progress. Click Re-plan for a full brief and implementation plan.'
                  )}
                </p>
              )}
              {card.agentContext ? (
                <div className="mt-6 border-t border-border pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {translate(
                      'auto.components.whatTaskToday.implementationPlan',
                      'Implementation plan'
                    )}
                  </h3>
                  <CommentMarkdown content={card.agentContext} variant="document" />
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
