export type ForkUpdateSettings = { repoPath: string | null; defaultRepoPath: string | null }

export type ForkUpdateCheckResult =
  | { ok: true; current: string; latest: string; hasUpdate: boolean }
  | { ok: false; error: string }

export type ForkUpdateRunResult = { ok: true } | { ok: false; error: string }

export type ForkUpdateApi = {
  getSettings: () => Promise<ForkUpdateSettings>
  setSettings: (args: { repoPath: string | null }) => Promise<void>
  check: () => Promise<ForkUpdateCheckResult>
  run: () => Promise<ForkUpdateRunResult>
}
