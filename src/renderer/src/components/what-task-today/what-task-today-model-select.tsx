import React from 'react'
import { WHAT_TASK_TODAY_MODEL_OPTIONS } from '../../../../shared/what-task-today-types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'

const DEFAULT_MODEL_VALUE = 'default'

export function ModelSelect(): React.JSX.Element {
  const [model, setModel] = React.useState<string>(DEFAULT_MODEL_VALUE)

  React.useEffect(() => {
    void window.api.whatTaskToday.getSettings().then((settings) => {
      setModel(settings.model ?? DEFAULT_MODEL_VALUE)
    })
  }, [])

  const handleChange = React.useCallback((next: string) => {
    setModel(next)
    void window.api.whatTaskToday.setSettings({
      model: next === DEFAULT_MODEL_VALUE ? null : next
    })
  }, [])

  return (
    <Select value={model} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-36" aria-label="Summarizer model">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_MODEL_VALUE}>
          {translate('auto.components.whatTaskToday.modelDefault', 'Default model')}
        </SelectItem>
        {WHAT_TASK_TODAY_MODEL_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
