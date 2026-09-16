# What Task Today — Feature Spec

Handoff spec. Design settled via grilling session. Read fully before coding.
All file paths relative to repo root unless noted.

## Goal

New "What Task Today" menu. Scans my Jira cards, an AI agent reads each card +
the codebase (via MCP) and writes a planning + implementation summary ahead of
time. Cards wait in the menu. Morning: read the summaries, click Start → opens a
worktree with the summary auto-injected as the agent's starting context — no
manual typing.

## MVP scope

Manual trigger only, local host only, Claude-only summarizer. Everything else
(schedule, ssh host for scan, other summarizer agents, JQL exclude, MCP form UI)
is Phase 2.

## Settled decisions

- **Q1** MVP = manual "Scan now" button first. Schedule = Phase 2.
- **Q2** Filter: `assignee=me` + status TODO. Dismissed cards excluded.
- **Q3** Summary = two parts (human-readable + structured agent-context), one markdown doc, sections marked.
- **Q4** Summary is plan only ("if you did this, here's what to do"). No auto-exec. User clicks Start.
- **Q5** Storage = single JSON file `~/.orca/what-task-today.json`, keyed by Jira issue key. (mirror `jira-sites.json` pattern)
- **Q6** Ignore = per-card dismiss button → issue key added to ignored set in same store; scan skips it. Unignore later.
- **Q7** Rescan = upsert by issue key. If Jira `updated` timestamp unchanged → keep summary, skip LLM. Cards no longer matching filter → drop. Dismissed stay dismissed.
- **Q8** Menu = new top-level sidebar pane `what-task-today` (copy Automations pattern).
- **Q9** Start = reuse composer, user picks repo at start time, inject the agent-context section as starting prompt. Requires extending Jira `linkedContext` (today Jira sends only the URL).
- **Q9 note** The full planning+implementation summary must be computed at scan time (needs codebase via MCP), ready to read before Start.
- **Q10** Summarizer = Claude only in MVP (clean `--mcp-config`). Start/worker agent = user-selectable (all agents, like Automations page). Selectable summarizer = Phase 2.
- **Q11** MCP config surface = raw JSON textarea, `.mcp.json` shape (`{"mcpServers": {...}}`), passed to summarizer via `--mcp-config`. Form UI = Phase 2. User must supply their own codebase MCP server (Orca ships none).
- **Q12** Summary structure — human section: what the card does / impact area / rough plan (bullets). agent-context section: detailed requirements + relevant files/modules + suggested implementation steps.

## Flow

1. **Scan now** button (manual, local) → fetch Jira cards `assignee=me` + TODO status, skip dismissed.
2. Per card → **summarizer = headless `claude -p`** + `--mcp-config <assembled>` → reads codebase via MCP → emits 2-section markdown (human + agent-context with full implementation plan).
3. Upsert into `~/.orca/what-task-today.json` (skip LLM if `updated` unchanged).
4. **What Task Today pane** in sidebar → read cards in the morning.
5. **Start** on a card → `openComposerForJiraItem`-style → composer opens → user picks repo → agent-context injected as startup prompt.

## Reuse (do NOT rebuild)

### Jira integration (exists, complete)

- Types: `src/shared/jira-types.ts` (`JiraIssue`, `JiraIssueFilter = 'assigned' | 'reported' | 'all' | 'done'`)
- Search/read: `src/main/jira/issues.ts` (barrel), `jira-issue-search.ts`, `jira-issue-mapping.ts`
- ADF↔markdown: `src/main/jira/adf-markdown.ts`
- Credentials already stored under `~/.orca/` via `getSecretStore()` — filter `'assigned'` already works.

### Headless LLM (exists — this is the summarizer engine)

- `src/main/text-generation/` — spawns `claude -p` as a piped child (no PTY, no worktree).
- Entry pattern: `spawnSourceControlAgent` (`source-control-agent-launch.ts`), `runLocalSourceControlPlan` (`source-control-local-process.ts`).
- Command plan: `buildCommitMessagePlan` in `src/shared/commit-message-plan.ts` — for Claude: `binary: 'claude'`, `args: ['-p', ...]`, prompt via stdin `stdinPayload`. **Add `--mcp-config <path>` to args for our summarizer.**
- Auth env: `prepareLocalCommitMessageAgentEnv` (`commit-message-agent-environment.ts`) → `applyClaudeEnvPatch` (uses selected managed Claude account).
- Has timeout + output cap + cancellation built in.

### Start-from-issue → worktree + context (exists)

- `openComposerForJiraItem(issue)` / `handleUseJiraItem` — `src/renderer/src/components/use-task-page-composer-actions.ts` (lines ~190-230). Builds `LinkedWorkItemSummary`, calls `openModal('new-workspace-composer', {...})`.
- Composer: `NewWorkspaceComposerModal.tsx` (`ComposerModalData` contract), `useComposerState` (`src/renderer/src/hooks/useComposerState.ts`).
- Repo pick UI: `new-workspace/NewWorkspaceComposerProjectSection.tsx` + `ProjectCombobox.tsx`. Jira `taskSourceContext` carries no repo → user picks. (This solves multi-repo frontend/backend: pick at Start.)
- Prompt assembly at submit: `full-submit-source-preparation.ts` → `buildAgentPromptWithContext(...)` (`src/renderer/src/lib/new-workspace.ts`).
- **GAP to fix**: `getLinkedWorkItemPromptContext` in `src/renderer/src/lib/linked-work-item-context.ts` emits a context block only for Linear; Jira/GitHub get `linkedUrls` only. To inject our summary, attach `linkedContext: { provider:'jira', version:1, renderedText: <agent-context section> }` to the Jira `linkedWorkItem` AND extend `getLinkedWorkItemPromptContext` to emit a block for Jira (mirror the Linear branch). Wrap prose with `buildContainedLinkedContextBlock` (cap `LINKED_CONTEXT_BLOCK_MAX_CHARS = 12000`).
- Reference for Linear's snapshot pattern: `src/renderer/src/lib/linear-issue-context-snapshot.ts`, `linear-linked-work-item.ts`.

### Top-level pane wiring (copy Automations)

Add `'what-task-today'` across 4 seams:

1. `src/shared/ui-chrome-types.ts` — add to `TopLevelView` union (~line 112).
2. `src/shared/top-level-view.ts` — add to `TOP_LEVEL_VIEW_LOOKUP`.
3. `src/renderer/src/store/slices/ui/ui-slice-contract-core.ts` — add to `UiViewHistory`, add `previousViewBeforeWhatTaskToday`, declare open/close actions on contract.
4. `src/renderer/src/store/slices/ui/ui-slice-view-actions.ts` — `openWhatTaskTodayPage` / `closeWhatTaskTodayPage` (copy `openAutomationsPage`/`closeAutomationsPage`).
5. `src/renderer/src/app-shell/AppWorkspaceShell.tsx` — lazy-import page, add `{activeView === 'what-task-today' ? <WhatTaskTodayPage/> : null}` in `ActivePage`.
6. `src/renderer/src/components/sidebar/SidebarNav.tsx` — copy Automations `ContextMenu`/`Button` block, pick a `lucide-react` icon, `whatTaskTodayActive = activeView === 'what-task-today'`.
7. Persistence guard: `ui-slice-hydration-sanitizers.ts` (`isTopLevelView`) + `src/renderer/src/lib/active-view-persist.ts` cover it once the enum is updated.

### MCP facts

- No central Orca MCP registry. MCP discovered from cwd via `.mcp.json` / `~/.codex/config.toml`.
- Config model + candidates: `src/shared/mcp-config.ts` (`MCP_CONFIG_CANDIDATES`, `MCP_STARTER_CONFIG`). Existing per-repo panel: `src/renderer/src/components/settings/McpConfigSection.tsx` (read/create-empty only).
- For summarizer: assemble our own mcp-config JSON from the new settings textarea, write to a temp file, pass `--mcp-config <file>` to the `claude -p` plan. Do NOT depend on cwd/worktree.

### Secret/file storage pattern

- `getSecretStore()` in `src/shared/secret-store.ts`; atomic 0600 file helpers in `src/main/integration-credential-file.ts`. For the (non-secret) summaries JSON, plain atomic write under `~/.orca/` is fine (no encryption needed). MCP config may contain tokens → if so, use the secret store.

### Automations (Phase 2 reference for schedule)

- Schedule model: `src/shared/automations-types.ts` (`Automation.rrule`, `dtstart`, `timezone`, `executionTargetType: 'local'|'ssh'`, `runContext.hostId`).
- Scheduler loop: `src/main/automations/service.ts` (`AutomationService`, 60s tick).
- Host resolution: `src/main/automations/run-target-resolution.ts`.
- Phase 2 can drive the scan via an automation or a dedicated cron; the agent-selection dropdown to copy lives in `src/renderer/src/components/automations/AutomationEditorDialog.tsx`.

## Progress (as of this session)

DONE (backend core, `tc:node` clean, quality gate clean, 6 tests passing):

- `src/shared/what-task-today-types.ts` — card + store file types.
- `src/main/what-task-today/summary-store-logic.ts` (+ `.test.ts`) — pure upsert/dismiss/unignore/prune/`shouldReSummarize`/`listActiveCards`/`normalizeStoreFile`.
- `src/main/what-task-today/summary-store.ts` — disk wrapper for `~/.orca/what-task-today.json`.
- `src/main/what-task-today/mcp-config-store.ts` — encrypted `~/.orca/what-task-today-mcp.enc`, validated via `inspectMcpConfigContent`.
- `src/shared/integration-credential-errors.ts` — added `'MCP'` to `IntegrationCredentialService`.
- `src/main/what-task-today/summarizer-prompt.ts` (+ `.test.ts`) — pure prompt build + 2-section parse.
- `src/main/what-task-today/summarizer.ts` — `scanWhatTaskToday()`: `listIssues('assigned')` → filter status category `'new'` (To Do) → skip unchanged → headless `claude -p --mcp-config <tmp> --dangerously-skip-permissions` (ambient auth) → parse → upsert → prune.

DONE (renderer + IPC, `tc` clean, quality + design-system gates clean, oxlint clean):

- `src/main/ipc/what-task-today.ts` + registered in `register-core-handlers.ts` — `whatTaskToday:*` handlers (scan/list/dismiss/unignore/agentContext/get+setMcpConfig).
- `src/preload/api/what-task-today-api.ts` + `-bridge.ts`, wired into `api-types.ts` (`whatTaskToday: WhatTaskTodayApi`) + `index.ts`.
- Top-level pane wired across all seams: `ui-chrome-types.ts`, `top-level-view.ts`, `ui-slice-contract-core.ts`, `ui-slice-view-actions.ts`, `ui-slice-task-actions.ts`, `AppWorkspaceShell.tsx`, `SidebarNav.tsx` (Sun icon), and the RPC value-parity schema `src/shared/rpc-contract/client-ui-params.ts` (`TopLevelViewSchema`).
- `src/renderer/src/components/what-task-today/WhatTaskTodayPage.tsx` — Scan now, card list (CommentMarkdown), Dismiss/Start, collapsible MCP config textarea.
- Composer injection: extended `getLinkedWorkItemPromptContext` (`linked-work-item-context.ts`) to emit a contained block for any provider carrying `linkedContext` (Jira now injects the agent-context section). Start builds a `buildJiraWorkspaceSource` linked item + `linkedContext` and opens `new-workspace-composer`; user picks the repo there.

REMAINING / not built: end-to-end run verification in the live Electron app (needs a connected Jira site + an MCP server). Phase 2 items unchanged (schedule, ssh scan host, selectable summarizer agent, JQL exclude, MCP form UI, managed-account auth).

Notes / ceilings left deliberately:

- Summarizer uses **ambient** Claude auth (user's `~/.claude`), not managed-account selection. Phase 2: wire `prepareLocalCommitMessageAgentEnv` resolvers (deep — resolver object comes from a `ClaudeRuntimeAuthService`).
- "TODO status" implemented as Jira status category `'new'`; JQL already filters `resolution = Unresolved`.

## To build (new)

1. **Summarizer service** (`src/main/`): fetch filtered Jira cards → per card, build a summarize prompt → run `claude -p --mcp-config` via the text-generation spawn pattern → parse 2-section markdown → upsert store. Skip cards whose `updated` is unchanged. Name the module concretely (e.g. `src/main/what-task-today/summarizer.ts`), not `helpers`.
2. **Store** (`src/main/what-task-today/`): read/write `~/.orca/what-task-today.json`. Shape: `{ cards: Record<issueKey, { issueKey, title, url, updated, humanSummary, agentContext, generatedAt }>, ignored: string[] }`. Atomic write.
3. **IPC/RPC**: `scanNow`, `list`, `dismiss`, `unignore`, `getMcpConfig`/`setMcpConfig`. Follow existing IPC + runtime RPC wiring (see `src/main/ipc/jira.ts` + `src/main/runtime/rpc/methods/jira.ts` as the shape to copy).
4. **What Task Today pane** (`src/renderer/src/components/what-task-today/WhatTaskTodayPage.tsx`): Scan-now button, card list rendering human summary, per-card Dismiss + Start buttons. Follow STYLEGUIDE.md / shadcn primitives.
5. **MCP config settings**: JSON textarea, persist via the setMcpConfig channel.
6. **Jira linkedContext block**: extend `getLinkedWorkItemPromptContext` + attach `linkedContext` in the Start action so agent-context is injected.

## Constraints / gotchas

- Follow `AGENTS.md`: STYLEGUIDE.md for all UI, no raw palette colors, no `max-lines` disables, concrete file names (no `helpers`/`utils`), prefer `.ts` over `.d.ts`, no unchecked type assertions.
- Cross-platform: paths via `path.join`; any child process via `runProcess`/`spawnProcess` in `src/shared/child-process/` (text-generation already does this).
- SSH/folder-workspace: MVP is local-only, but don't hardcode assumptions that block Phase-2 ssh host for scan.
- Adding a `TopLevelView` touches every persistence boundary validating disk/IPC values — update all seams listed above or hydration drops the view.
- Verify: `pnpm tc`, `pnpm test`, `pnpm run check:code-quality:changed`, `pnpm run lint:design-system`.

## Suggested build order

1. Store + types (`~/.orca/what-task-today.json`) — pure, testable, leave one `test_*` for upsert/skip-unchanged/dismiss logic.
2. Summarizer service against Jira + `claude -p --mcp-config`.
3. IPC/RPC surface.
4. Sidebar pane + card UI.
5. MCP config textarea.
6. Jira `linkedContext` injection on Start.

Then Phase 2: schedule (automations), ssh host, selectable summarizer agent, JQL exclude, MCP form UI.
