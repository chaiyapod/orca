import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SearchableSetting } from './SearchableSetting'
import { translate } from '@/i18n/i18n'

// Local-only dev tool: rebuilds this fork from the latest upstream/main and
// reinstalls it over the running app. Not part of the shipped product —
// only useful when running from a checkout that has update-fork.sh.
export function ForkUpdateSettingsSection(): React.JSX.Element {
  const [repoPath, setRepoPath] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    void window.api.forkUpdate.getSettings().then((settings) => {
      setRepoPath(settings.repoPath ?? settings.defaultRepoPath ?? '')
    })
  }, [])

  const handlePathChange = useCallback((value: string) => {
    setRepoPath(value)
    void window.api.forkUpdate.setSettings({ repoPath: value.trim() ? value : null })
  }, [])

  const handleCheckAndUpdate = useCallback(async () => {
    setRunning(true)
    try {
      const result = await window.api.forkUpdate.check()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (!result.hasUpdate) {
        toast.success(
          translate(
            'auto.components.settings.ForkUpdateSettingsSection.upToDate',
            'Fork is up to date ({{value0}}).',
            { value0: result.current }
          )
        )
        return
      }
      // duration: Infinity -> stays until the rebuilt app restarts over this one.
      const updatingToast = toast.loading(
        translate(
          'auto.components.settings.ForkUpdateSettingsSection.updating',
          'Updating to {{value0}}… the app will restart when it’s done.',
          { value0: result.latest }
        ),
        { duration: Infinity }
      )
      const runResult = await window.api.forkUpdate.run()
      if (!runResult.ok) {
        toast.dismiss(updatingToast)
        toast.error(runResult.error)
      }
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <SearchableSetting
      title={translate('auto.components.settings.ForkUpdateSettingsSection.title', 'Update Fork')}
      description={translate(
        'auto.components.settings.ForkUpdateSettingsSection.description',
        'Local dev only. Rebuilds this fork from the latest upstream/main and reinstalls it.'
      )}
      keywords={['fork', 'update', 'rebuild', 'upstream']}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Input
          value={repoPath}
          onChange={(event) => handlePathChange(event.target.value)}
          placeholder={translate(
            'auto.components.settings.ForkUpdateSettingsSection.pathPlaceholder',
            '/path/to/repo (containing update-fork.sh)'
          )}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleCheckAndUpdate()}
          disabled={running || !repoPath.trim()}
        >
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {translate(
            'auto.components.settings.ForkUpdateSettingsSection.action',
            'Check & Update Fork'
          )}
        </Button>
      </div>
    </SearchableSetting>
  )
}
