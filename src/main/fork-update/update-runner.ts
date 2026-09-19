// Local-only dev tool: checks the fork's running version against the latest
// stable upstream release tag, and kicks off update-fork.sh (detached, so it
// survives this process quitting itself mid-run) when a rebuild is wanted.

import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

export type ForkUpdateCheckResult =
  | { ok: true; current: string; latest: string; hasUpdate: boolean }
  | { ok: false; error: string }

export type ForkUpdateRunResult = { ok: true } | { ok: false; error: string }

function scriptPath(repoPath: string): string {
  return join(repoPath, 'update-fork.sh')
}

// Compares only the numeric X.Y.Z prefix — a locally-stamped version can
// carry a "-local.<timestamp>.<commit>" suffix that isn't ordered semver.
function compareVersions(a: string, b: string): number {
  const partsA = a.split('-')[0].split('.').map(Number)
  const partsB = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

export function checkForkUpdateVersion(repoPath: string): ForkUpdateCheckResult {
  if (!existsSync(scriptPath(repoPath))) {
    return { ok: false, error: `update-fork.sh not found at ${repoPath}` }
  }
  try {
    execFileSync('git', ['fetch', 'upstream', '--tags'], { cwd: repoPath, stdio: 'ignore' })
    const tags = execFileSync('git', ['tag', '-l', 'v1.4.*'], { cwd: repoPath, encoding: 'utf-8' })
    const latestTag = tags
      .split('\n')
      .map((tag) => tag.trim())
      .filter((tag) => /^v1\.4\.\d+$/.test(tag))
      .sort((a, b) => Number(a.split('.')[2]) - Number(b.split('.')[2]))
      .at(-1)
    if (!latestTag) {
      return { ok: false, error: 'Could not resolve the latest release tag.' }
    }
    const latest = latestTag.slice(1)
    const current = app.getVersion()
    return { ok: true, current, latest, hasUpdate: compareVersions(current, latest) < 0 }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function runForkUpdate(repoPath: string): ForkUpdateRunResult {
  if (!existsSync(scriptPath(repoPath))) {
    return { ok: false, error: `update-fork.sh not found at ${repoPath}` }
  }
  // Why: detached + ignored stdio so the rebuild survives this app quitting
  // itself partway through (update-fork.sh's own install step does that).
  const child = spawn('bash', [scriptPath(repoPath)], {
    cwd: repoPath,
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
  return { ok: true }
}
