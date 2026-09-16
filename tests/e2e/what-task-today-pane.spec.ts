/**
 * The What Task Today top-level pane opens from the store action and renders
 * its empty state and Scan now control, plus a Cards/Ignored tab switcher
 * (MCP config / error log still live in Settings, covered separately below).
 */

import { test, expect } from './helpers/orca-app'
import { getStoreState, waitForSessionReady } from './helpers/store'

test.describe('what task today', () => {
  test.beforeEach(async ({ orcaPage }) => {
    await waitForSessionReady(orcaPage)
  })

  test('opens the pane and renders the empty Cards list', async ({ orcaPage }) => {
    await orcaPage.evaluate(() => {
      window.__store!.getState().openWhatTaskTodayPage()
    })

    await expect
      .poll(async () => getStoreState<string>(orcaPage, 'activeView'), { timeout: 5_000 })
      .toBe('what-task-today')

    await expect(orcaPage.getByRole('heading', { name: 'What Task Today' })).toBeVisible()
    await expect(orcaPage.getByRole('button', { name: 'Scan now' })).toBeVisible()
    await expect(orcaPage.getByText('No summarized cards yet.')).toBeVisible()

    await orcaPage.getByRole('tab', { name: 'Ignored' }).click()
    await expect(orcaPage.getByRole('heading', { name: 'Ignored cards' })).toBeVisible()
    await expect(orcaPage.getByText('No ignored cards.')).toBeVisible()

    await orcaPage.screenshot({ path: 'test-results/what-task-today-pane.png' })
  })

  test('Settings has a What Task Today section with MCP config, error log, and clear data', async ({
    orcaPage
  }) => {
    await orcaPage.evaluate(() => {
      window.__store!.getState().openSettingsPage()
    })
    const searchInput = orcaPage.getByPlaceholder('Search settings')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill('What Task Today')
    await orcaPage.getByRole('button', { name: 'What Task Today' }).first().click()

    await expect(orcaPage.getByRole('heading', { name: 'What Task Today' })).toBeVisible()
    await expect(orcaPage.getByRole('heading', { name: 'Codebase MCP config' })).toBeVisible()
    await expect(orcaPage.getByRole('button', { name: 'Save' })).toBeVisible()
    await expect(orcaPage.getByRole('heading', { name: 'Error log' })).toBeVisible()
    await expect(orcaPage.getByRole('button', { name: 'Clear synced data' })).toBeVisible()

    await orcaPage.screenshot({ path: 'test-results/what-task-today-settings.png' })
  })
})
