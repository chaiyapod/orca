import React from 'react'
import { ArrowRight, ExternalLink, EyeOff, RefreshCw } from 'lucide-react'
import type { WhatTaskTodayCard } from '../../../../shared/what-task-today-types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { cn } from '@/lib/utils'
import { getJiraStatusTone } from '@/components/task-page-jira-status-tone'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import { translate } from '@/i18n/i18n'

function formatUpdatedAtDate(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
}

// Same right-side aside pattern as the Task page's Jira detail view
// (jira-issue-workspace-content.tsx) — icon + label rows, not buttons.
function AsideAction({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  disabled
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  label: string
  onClick: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon className={cn('size-3.5 shrink-0', iconClassName)} />
          <span className="truncate">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

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
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        {card ? (
          <>
            <div className="flex-none border-b border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span className="font-mono">{card.issueKey}</span>
                <span>{formatUiRelativeTimeFromDate(card.updated)}</span>
              </div>
              <h2 className="mt-1 text-[20px] font-semibold leading-tight text-foreground">
                {card.title}
              </h2>
            </div>
            {card.statusName ? (
              <div className="flex flex-none items-center border-b border-border/60 px-4 py-2.5">
                <span
                  className={cn(
                    'inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    getJiraStatusTone(card.statusCategory)
                  )}
                >
                  <span className="truncate">{card.statusName}</span>
                </span>
              </div>
            ) : null}
            {replanError ? (
              <p className="whitespace-pre-wrap border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {replanError}
              </p>
            ) : null}
            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_228px]">
              <div className="scrollbar-sleek min-h-0 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
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
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      {translate(
                        'auto.components.whatTaskToday.implementationPlan',
                        'Implementation plan'
                      )}
                    </h3>
                    <CommentMarkdown content={card.agentContext} variant="document" />
                  </div>
                ) : null}
              </div>

              <aside className="border-t border-border/50 bg-muted/20 px-3 py-3 xl:border-l xl:border-t-0">
                <Button onClick={() => onStart(card)} className="mb-3 w-full justify-center">
                  {translate('auto.components.whatTaskToday.start', 'Start')}
                  <ArrowRight className="size-4" />
                </Button>
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/50 pb-3 text-[11px]">
                  <span className="text-muted-foreground">
                    {translate('auto.components.whatTaskToday.updatedAtLabel', 'Updated')}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatUpdatedAtDate(card.updated)}
                  </span>
                </div>
                <div className="grid gap-1">
                  <AsideAction
                    icon={ExternalLink}
                    label={translate('auto.components.whatTaskToday.openInJira', 'Open in Jira')}
                    onClick={() => window.api.shell.openUrl(card.url)}
                  />
                  <AsideAction
                    icon={RefreshCw}
                    iconClassName={replanning ? 'animate-spin' : undefined}
                    label={
                      replanning
                        ? translate('auto.components.whatTaskToday.replanning', 'Re-planning…')
                        : translate('auto.components.whatTaskToday.replan', 'Re-plan')
                    }
                    onClick={() => onReplan(card.issueKey)}
                    disabled={replanning}
                  />
                  <AsideAction
                    icon={EyeOff}
                    label={translate('auto.components.whatTaskToday.ignoreButton', 'Ignore')}
                    onClick={() => onDismiss(card.issueKey)}
                  />
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
