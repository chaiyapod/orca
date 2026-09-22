#!/usr/bin/env bash
# Rebases this branch onto the latest stable release tag and builds THAT (arm64
# only, dir target — no dmg packing, no codesign wait) in a throwaway,
# detached git worktree — so the current checkout/branch is never touched —
# installs over the running fork, and relaunches it. Mirrors build-mac-local.sh.
#
# Why rebase this branch instead of building the raw tag: fork-only files (this
# script, build-mac-local.sh, the Settings "Update Fork" button,
# electron-builder.config.cjs's ORCA_FORK_* support) exist only on this branch.
# Building the pure tag would silently drop all of them — including this
# script's own ability to run again next time.
set -euo pipefail
cd "$(dirname "$0")"
SOURCE_REF="$(git rev-parse HEAD)"

# Why: read defaults from build-mac-local.sh itself instead of duplicating
# them here, so this script's install target always matches whatever name
# that script currently builds — no separate hardcoded value to drift out
# of sync with it.
default_from_build_script() {
  grep "export $1=" build-mac-local.sh | sed -E 's/.*="([^"]*)".*/\1/'
}
export ORCA_FORK_PRODUCT_NAME="${ORCA_FORK_PRODUCT_NAME:-$(default_from_build_script ORCA_FORK_PRODUCT_NAME)}"
export ORCA_FORK_APP_ID="${ORCA_FORK_APP_ID:-$(default_from_build_script ORCA_FORK_APP_ID)}"
export ORCA_FORK_PROTOCOL="${ORCA_FORK_PROTOCOL:-$(default_from_build_script ORCA_FORK_PROTOCOL)}"

echo "[update-fork] fetching release tags..."
git fetch upstream --tags --force  # upstream re-tags releases; --force avoids a clobber reject

# Build the latest STABLE release, not main. main is bleeding-edge dev (100+
# commits past the last release cut); the newest vX.Y.Z tag is the prod snapshot,
# and its package.json version already matches the tag — so Orca's "Check for
# update" sees this fork as current instead of flagging a phantom update it can
# never install anyway (adhoc-signed fork can't pass Squirrel.Mac's check).
LATEST_TAG="$(git tag -l 'v1.4.*' | grep -E '^v1\.4\.[0-9]+$' | sort -t. -k3 -n | tail -1)"
[ -n "$LATEST_TAG" ] || { echo "[update-fork] could not resolve latest release tag"; exit 1; }
LATEST_VERSION="${LATEST_TAG#v}"
echo "[update-fork] building stable $LATEST_TAG"

WORKTREE_DIR="$(mktemp -d)"
cleanup() {
  git worktree remove --force "$WORKTREE_DIR" 2>/dev/null || true
  [ -n "${SHIM:-}" ] && rm -rf "$SHIM"
}
trap cleanup EXIT
git worktree add --detach "$WORKTREE_DIR" "$SOURCE_REF" >/dev/null

echo "[update-fork] rebasing this branch's tip onto $LATEST_TAG..."
(
  cd "$WORKTREE_DIR"
  if ! git rebase "$LATEST_TAG"; then
    git rebase --abort
    echo "[update-fork] rebase onto $LATEST_TAG conflicted — resolve manually on the real branch first"
    exit 1
  fi
)

node -e "
const fs = require('node:fs')
const path = '$WORKTREE_DIR/package.json'
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'))
pkg.version = '$LATEST_VERSION'
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n')
"

NODE24_BIN="$(ls -d "$HOME"/.volta/tools/image/node/24.*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE24_BIN" ] || { echo "node 24 not found. run: volta install node@24"; exit 1; }
SHIM="$(mktemp -d)"
export PATH="$NODE24_BIN:$PATH"
corepack enable --install-directory "$SHIM" pnpm
export PATH="$SHIM:$PATH"

echo "[update-fork] node: $(node --version)  pnpm: $(pnpm --version)"

pushd "$WORKTREE_DIR" >/dev/null
pnpm install --frozen-lockfile
pnpm run build:desktop
pnpm run build:computer-macos
pnpm run build:keyboard-layout-macos
pnpm run build:notification-status-macos
pnpm run ensure:electron-runtime
# Why: upstream/main's electron-builder.config.cjs has no ORCA_FORK_* env
# support at all (that's a local-branch-only customization) — it hardcodes
# productName "Orca" / appId com.stablyai.orca. Override both directly on
# the CLI so this build stays a separate app no matter what's checked out.
pnpm exec electron-builder --config config/electron-builder.config.cjs --arm64 --mac dir \
  -c.appId="$ORCA_FORK_APP_ID" \
  -c.productName="$ORCA_FORK_PRODUCT_NAME"
popd >/dev/null

APP_PATH="$WORKTREE_DIR/dist/mac-arm64/$ORCA_FORK_PRODUCT_NAME.app"
[ -d "$APP_PATH" ] || { echo "[update-fork] build did not produce $APP_PATH"; exit 1; }

echo "[update-fork] quitting running '$ORCA_FORK_PRODUCT_NAME' if open..."
osascript -e "tell application \"$ORCA_FORK_PRODUCT_NAME\" to quit" 2>/dev/null || true
sleep 1

echo "[update-fork] installing to /Applications..."
rm -rf "/Applications/$ORCA_FORK_PRODUCT_NAME.app"
cp -R "$APP_PATH" "/Applications/$ORCA_FORK_PRODUCT_NAME.app"

echo "[update-fork] relaunching..."
open "/Applications/$ORCA_FORK_PRODUCT_NAME.app"
echo "[update-fork] done."
