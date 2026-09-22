#!/usr/bin/env bash
# Personal macOS build. pnpm standalone bundles node 22 which can't strip .ts in
# build scripts; force pnpm through volta's node 24 via a corepack shim.
set -euo pipefail
cd "$(dirname "$0")"

# Distinct name/appId/protocol -> installs BESIDE real Orca: own .app, userData
# dir, single-instance lock, and no LaunchServices / orca:// clash.
# Hard-set (not :-) so a stale ORCA_FORK_* left in the shell can't override us.
export ORCA_FORK_PRODUCT_NAME="Orca X"
export ORCA_FORK_APP_ID="com.stablyai.orca.x"
export ORCA_FORK_PROTOCOL="orca-x"
# arm64 only -> faster, no cross-arch native deps.
export ORCA_BUILD_MAC_ARCH="arm64"

# Build the latest STABLE release, not main. main is bleeding-edge dev (100+
# commits past the last release cut); the newest vX.Y.Z tag is the prod snapshot.
# Rebase this branch's fork-only commits onto that tag so every build = latest
# prod code, and its package.json version already matches the tag.
echo "syncing onto latest stable release tag..."
git fetch upstream --tags --force  # upstream re-tags releases; --force avoids a clobber reject
LATEST_TAG="$(git tag -l 'v1.4.*' | grep -E '^v1\.4\.[0-9]+$' | sort -t. -k3 -n | tail -1)"
[ -n "$LATEST_TAG" ] || { echo "could not resolve latest release tag"; exit 1; }
LATEST_VERSION="${LATEST_TAG#v}"
echo "latest stable release: $LATEST_TAG"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "working tree dirty — commit or stash before build (rebase needs a clean tree)"; exit 1
fi
if ! git rebase "$LATEST_TAG"; then
  git rebase --abort
  echo "rebase onto $LATEST_TAG conflicted — resolve manually first, then rebuild"; exit 1
fi

# Stamp version = the release tag. The tag's package.json already carries it, but
# rebasing our fork commits on top can leave the base commit's number; force it.
# Restored after build so the working tree stays clean for the next run's rebase.
echo "stamping version $LATEST_VERSION"
SHIM=""
trap 'git checkout -- package.json 2>/dev/null || true; [ -n "$SHIM" ] && rm -rf "$SHIM"' EXIT
node -e "const f='package.json',p=require('./'+f);p.version='$LATEST_VERSION';require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"

NODE24_BIN="$(ls -d "$HOME"/.volta/tools/image/node/24.*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE24_BIN" ] || { echo "node 24 not found. run: volta install node@24"; exit 1; }

SHIM="$(mktemp -d)"
export PATH="$NODE24_BIN:$PATH"
corepack enable --install-directory "$SHIM" pnpm
export PATH="$SHIM:$PATH"

echo "building '$ORCA_FORK_PRODUCT_NAME' ($ORCA_FORK_APP_ID)"
echo "node: $(node --version)  pnpm: $(pnpm --version)"
pnpm build:mac
echo "done -> dist/orca-macos-arm64.dmg"
echo "installs as '$ORCA_FORK_PRODUCT_NAME.app'; data in ~/Library/Application Support/$ORCA_FORK_PRODUCT_NAME"

# Publish the rebased fork branch. --force-with-lease: rebase rewrote history, so
# a plain push is rejected; lease still refuses to clobber commits we haven't seen.
echo "force-pushing rebased branch to origin..."
git push --force-with-lease origin HEAD
