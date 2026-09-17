// Every What Task Today file lives under one folder instead of scattered
// loose in ~/.orca. migrateLegacyFile moves a pre-existing file from the old
// flat layout in place the first time its new path is read, so upgrading
// users keep their synced cards, settings, and MCP config.
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function whatTaskTodayDataDir(): string {
  const dir = join(homedir(), '.orca', 'what-task-today')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function migrateLegacyFile(legacyPath: string, newPath: string): void {
  if (!existsSync(newPath) && existsSync(legacyPath)) {
    renameSync(legacyPath, newPath)
  }
}
