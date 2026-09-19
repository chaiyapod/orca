import { app, ipcMain } from 'electron'
import { readForkUpdateSettings, saveForkUpdateSettings } from '../fork-update/settings-store'
import { checkForkUpdateVersion, runForkUpdate } from '../fork-update/update-runner'

/** Registers every `forkUpdate:*` IPC handler on the main process. */
export function registerForkUpdateHandlers(): void {
  ipcMain.handle('forkUpdate:getSettings', async () => ({
    ...readForkUpdateSettings(),
    // Why: electron-vite dev launches with cwd at the repo root, so this is
    // usually right on first run; the user can override and save it either way.
    defaultRepoPath: app.isPackaged ? null : process.cwd()
  }))

  ipcMain.handle('forkUpdate:setSettings', async (_event, args: { repoPath: string | null }) => {
    saveForkUpdateSettings({ repoPath: args?.repoPath ?? null })
  })

  ipcMain.handle('forkUpdate:check', async () => {
    const { repoPath } = readForkUpdateSettings()
    if (!repoPath) {
      return { ok: false, error: 'Set the repo path first.' }
    }
    return checkForkUpdateVersion(repoPath)
  })

  ipcMain.handle('forkUpdate:run', async () => {
    const { repoPath } = readForkUpdateSettings()
    if (!repoPath) {
      return { ok: false, error: 'Set the repo path first.' }
    }
    return runForkUpdate(repoPath)
  })
}
