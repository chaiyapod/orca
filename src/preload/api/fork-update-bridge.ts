import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

export const forkUpdateApi = {
  getSettings: () => ipcRenderer.invoke('forkUpdate:getSettings'),
  setSettings: (args: { repoPath: string | null }) =>
    ipcRenderer.invoke('forkUpdate:setSettings', args),
  check: () => ipcRenderer.invoke('forkUpdate:check'),
  run: () => ipcRenderer.invoke('forkUpdate:run')
} satisfies PreloadApi['forkUpdate']
