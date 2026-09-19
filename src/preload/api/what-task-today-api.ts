import type {
  WhatTaskTodayAgentContextFileResult,
  WhatTaskTodayCard,
  WhatTaskTodayIgnoredEntry,
  WhatTaskTodayLogEntry,
  WhatTaskTodayMcpConfigSaveResult,
  WhatTaskTodayReplanResponse,
  WhatTaskTodayScanResponse,
  WhatTaskTodaySettings
} from '../../shared/what-task-today-types'

export type WhatTaskTodayApi = {
  scan: () => Promise<WhatTaskTodayScanResponse>
  list: () => Promise<WhatTaskTodayCard[]>
  replan: (args: { issueKey: string }) => Promise<WhatTaskTodayReplanResponse>
  dismiss: (args: { issueKey: string }) => Promise<void>
  unignore: (args: { issueKey: string }) => Promise<void>
  listIgnored: () => Promise<WhatTaskTodayIgnoredEntry[]>
  agentContext: (args: { issueKey: string }) => Promise<string | null>
  writeAgentContextFile: (args: {
    issueKey: string
  }) => Promise<WhatTaskTodayAgentContextFileResult>
  getDataFolderPath: () => Promise<string>
  getSettings: () => Promise<WhatTaskTodaySettings>
  setSettings: (args: Partial<WhatTaskTodaySettings>) => Promise<void>
  getMcpConfig: () => Promise<string | null>
  setMcpConfig: (args: { content: string }) => Promise<WhatTaskTodayMcpConfigSaveResult>
  getLog: () => Promise<WhatTaskTodayLogEntry[]>
  clearCards: () => Promise<void>
}
