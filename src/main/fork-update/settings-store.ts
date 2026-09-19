// Local-only dev tool: where the fork's own git checkout lives on disk, so
// the "Update Fork" Settings button knows where to find update-fork.sh.
// ~/.orca/fork-update-settings.json — same plain-write convention as the
// other small settings stores in this app.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type ForkUpdateSettings = { repoPath: string | null }

function settingsPath(): string {
  return join(homedir(), '.orca', 'fork-update-settings.json')
}

export function readForkUpdateSettings(): ForkUpdateSettings {
  const path = settingsPath()
  if (!existsSync(path)) {
    return { repoPath: null }
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
    const repoPath =
      parsed &&
      typeof parsed === 'object' &&
      'repoPath' in parsed &&
      typeof parsed.repoPath === 'string'
        ? parsed.repoPath
        : null
    return { repoPath }
  } catch {
    return { repoPath: null }
  }
}

export function saveForkUpdateSettings(settings: ForkUpdateSettings): void {
  const dir = join(homedir(), '.orca')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const repoPath =
    typeof settings.repoPath === 'string' && settings.repoPath.trim()
      ? settings.repoPath.trim()
      : null
  writeFileSync(settingsPath(), JSON.stringify({ repoPath }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}
