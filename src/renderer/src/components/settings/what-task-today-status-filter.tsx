import React from 'react'
import type { JiraSite, JiraStatus } from '../../../../shared/jira-types'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'

// "Done" isn't offered — a scan never summarizes or detects it, so there's
// nothing a "Done" checkbox here could turn on.
const PICKABLE_CATEGORY_KEYS = new Set(['new', 'indeterminate'])

// Different issue types can each own a status with the same name (same name,
// different id) — the filter matches by name, so the picker must too, or the
// same checkbox would appear twice.
function dedupeStatusesByName(statuses: JiraStatus[]): JiraStatus[] {
  const seen = new Set<string>()
  return statuses.filter((status) => {
    if (seen.has(status.name)) {
      return false
    }
    seen.add(status.name)
    return true
  })
}

export function StatusCategoryFilter(): React.JSX.Element {
  const [sites, setSites] = React.useState<JiraSite[]>([])
  const [siteId, setSiteId] = React.useState<string | null>(null)
  const [statuses, setStatuses] = React.useState<JiraStatus[]>([])
  const [statusesLoading, setStatusesLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<string[] | null>(null)

  React.useEffect(() => {
    void window.api.jira.status().then((status) => {
      const nextSites = status.sites ?? []
      setSites(nextSites)
      setSiteId(status.selectedSiteId ?? status.activeSiteId ?? nextSites[0]?.id ?? null)
    })
    void window.api.whatTaskToday.getSettings().then((settings) => {
      setSelected(settings.statusNames)
    })
  }, [])

  React.useEffect(() => {
    if (!siteId) {
      setStatuses([])
      setStatusesLoading(false)
      return
    }
    setStatusesLoading(true)
    void window.api.jira
      .listStatuses({ siteId })
      .then((allStatuses) => {
        setStatuses(
          dedupeStatusesByName(
            allStatuses.filter((status) => PICKABLE_CATEGORY_KEYS.has(status.categoryKey))
          )
        )
      })
      .finally(() => setStatusesLoading(false))
  }, [siteId])

  // Why: null means "never customized" — the scan itself defaults to every
  // "new" status, so the checkboxes should visibly match that until the user
  // actually touches one (see handleToggle's seed-from-effective step).
  const effectiveSelected = React.useMemo(
    () =>
      selected ??
      statuses.filter((status) => status.categoryKey === 'new').map((status) => status.name),
    [selected, statuses]
  )

  const handleToggle = React.useCallback(
    (statusName: string, checked: boolean) => {
      const base = selected ?? effectiveSelected
      const next = checked
        ? [...new Set([...base, statusName])]
        : base.filter((entry) => entry !== statusName)
      if (next.length === 0) {
        return
      }
      setSelected(next)
      void window.api.whatTaskToday.setSettings({ statusNames: next })
    },
    [selected, effectiveSelected]
  )

  return (
    <div className="space-y-3">
      {sites.length > 1 ? (
        <Select value={siteId ?? undefined} onValueChange={setSiteId}>
          <SelectTrigger size="sm" className="w-56" aria-label="Jira site">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.displayName || site.siteUrl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {statusesLoading ? (
        <p className="text-xs text-muted-foreground">
          {translate('auto.components.settings.whatTaskToday.statusesLoading', 'Loading statuses…')}
        </p>
      ) : statuses.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {translate(
            'auto.components.settings.whatTaskToday.statusesEmpty',
            'Connect Jira to pick statuses.'
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          {statuses.map((status) => (
            <label key={status.id} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={effectiveSelected.includes(status.name)}
                onCheckedChange={(checked) => handleToggle(status.name, checked === true)}
              />
              {status.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
