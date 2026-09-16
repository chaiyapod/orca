import React from 'react'
import {
  DEFAULT_WHAT_TASK_TODAY_STATUS_CATEGORIES,
  WHAT_TASK_TODAY_STATUS_CATEGORIES,
  type WhatTaskTodayStatusCategory
} from '../../../../shared/what-task-today-types'
import { Checkbox } from '@/components/ui/checkbox'

export function StatusCategoryFilter(): React.JSX.Element {
  const [selected, setSelected] = React.useState<WhatTaskTodayStatusCategory[]>(
    DEFAULT_WHAT_TASK_TODAY_STATUS_CATEGORIES
  )

  React.useEffect(() => {
    void window.api.whatTaskToday.getSettings().then((settings) => {
      setSelected(settings.statusCategories ?? DEFAULT_WHAT_TASK_TODAY_STATUS_CATEGORIES)
    })
  }, [])

  const handleToggle = React.useCallback(
    (category: WhatTaskTodayStatusCategory, checked: boolean) => {
      setSelected((current) => {
        const next = checked
          ? [...new Set([...current, category])]
          : current.filter((entry) => entry !== category)
        if (next.length === 0) {
          return current
        }
        void window.api.whatTaskToday.setSettings({ statusCategories: next })
        return next
      })
    },
    []
  )

  return (
    <div className="flex flex-wrap items-center gap-4">
      {WHAT_TASK_TODAY_STATUS_CATEGORIES.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={selected.includes(key)}
            onCheckedChange={(checked) => handleToggle(key, checked === true)}
          />
          {label}
        </label>
      ))}
    </div>
  )
}
