import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

export const whatTaskTodayApi = {
  scan: () => ipcRenderer.invoke('whatTaskToday:scan'),
  list: () => ipcRenderer.invoke('whatTaskToday:list'),
  replan: (args: { issueKey: string }) => ipcRenderer.invoke('whatTaskToday:replan', args),
  dismiss: (args: { issueKey: string }): Promise<void> =>
    ipcRenderer.invoke('whatTaskToday:dismiss', args),
  unignore: (args: { issueKey: string }): Promise<void> =>
    ipcRenderer.invoke('whatTaskToday:unignore', args),
  listIgnored: () => ipcRenderer.invoke('whatTaskToday:listIgnored'),
  agentContext: (args: { issueKey: string }) =>
    ipcRenderer.invoke('whatTaskToday:agentContext', args),
  getSettings: () => ipcRenderer.invoke('whatTaskToday:getSettings'),
  setSettings: (args: { model: string | null }): Promise<void> =>
    ipcRenderer.invoke('whatTaskToday:setSettings', args),
  getMcpConfig: () => ipcRenderer.invoke('whatTaskToday:getMcpConfig'),
  setMcpConfig: (args: { content: string }) =>
    ipcRenderer.invoke('whatTaskToday:setMcpConfig', args),
  getLog: () => ipcRenderer.invoke('whatTaskToday:getLog'),
  clearCards: (): Promise<void> => ipcRenderer.invoke('whatTaskToday:clearCards')
} satisfies PreloadApi['whatTaskToday']
