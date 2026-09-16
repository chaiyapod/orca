import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export const getWhatTaskTodaySettingsSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate(
      'auto.components.settings.whatTaskToday.mcpConfigTitle',
      'Codebase MCP config'
    ),
    description: translate(
      'auto.components.settings.whatTaskToday.mcpConfigDescription',
      'JSON in .mcp.json shape ({ "mcpServers": { … } }). Point it at your codebases so the summarizer can inspect them.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordMcp', 'mcp'),
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordJira', 'jira'),
      ...translateSearchKeyword(
        'auto.components.settings.whatTaskToday.keywordWhatTaskToday',
        'what task today'
      )
    ]
  },
  {
    title: translate('auto.components.settings.whatTaskToday.errorLogTitle', 'Error log'),
    description: translate(
      'auto.components.settings.whatTaskToday.errorLogDescription',
      'Recent scan and re-plan failures, most recent first.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordError', 'error'),
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordLog', 'log')
    ]
  },
  {
    title: translate('auto.components.settings.whatTaskToday.clearDataSectionTitle', 'Synced data'),
    description: translate(
      'auto.components.settings.whatTaskToday.clearDataSectionDescription',
      'Clear the Jira cards summarized so far. Useful if the local data looks stale or wrong.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordClear', 'clear'),
      ...translateSearchKeyword('auto.components.settings.whatTaskToday.keywordReset', 'reset')
    ]
  }
])
