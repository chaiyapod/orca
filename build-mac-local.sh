#!/usr/bin/env bash
# Personal macOS build. pnpm standalone bundles node 22 which can't strip .ts in
# build scripts; force pnpm through volta's node 24 via a corepack shim.
set -euo pipefail
cd "$(dirname "$0")"

# Distinct name/appId/protocol -> installs BESIDE real Orca: own .app, userData
# dir, single-instance lock, and no LaunchServices / orca:// clash.
export ORCA_FORK_PRODUCT_NAME="${ORCA_FORK_PRODUCT_NAME:-Orca Ohtraeo}"
export ORCA_FORK_APP_ID="${ORCA_FORK_APP_ID:-com.stablyai.orca.ohtraeo}"
export ORCA_FORK_PROTOCOL="${ORCA_FORK_PROTOCOL:-orca-ohtraeo}"

NODE24_BIN="$(ls -d "$HOME"/.volta/tools/image/node/24.*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE24_BIN" ] || { echo "node 24 not found. run: volta install node@24"; exit 1; }

SHIM="$(mktemp -d)"
trap 'rm -rf "$SHIM"' EXIT
export PATH="$NODE24_BIN:$PATH"
corepack enable --install-directory "$SHIM" pnpm
export PATH="$SHIM:$PATH"

echo "building '$ORCA_FORK_PRODUCT_NAME' ($ORCA_FORK_APP_ID)"
echo "node: $(node --version)  pnpm: $(pnpm --version)"
pnpm build:mac
echo "done -> dist/orca-macos-arm64.dmg  dist/orca-macos-x64.dmg"
echo "installs as '$ORCA_FORK_PRODUCT_NAME.app'; data in ~/Library/Application Support/$ORCA_FORK_PRODUCT_NAME"
