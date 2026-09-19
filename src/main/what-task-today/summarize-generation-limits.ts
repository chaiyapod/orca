// Own timeout/output caps for the summarizer, separate from
// source-control-generation-limits.ts: this run calls MCP codebase tools and
// runs far longer than a one-shot commit-message generation.
export const WHAT_TASK_TODAY_GENERATION_TIMEOUT_MS = 10 * 60_000
export const MAX_WHAT_TASK_TODAY_OUTPUT_BYTES = 4 * 1024 * 1024
