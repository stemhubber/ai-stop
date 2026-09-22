#!/usr/bin/env bash
set -euo pipefail

# Local build/test/deploy pipeline for Webilo (smart-shop).
#
# GitHub Actions quota has been exhausted on this account, so PRs can't
# reliably merge through GitHub's required-checks UI and deploys often have
# to happen from a local checkout by hand instead. This script exists so
# that manual path still builds and tests both the frontend and Cloud
# Functions, verifies the build actually has real Firebase config baked in,
# and only then deploys - instead of someone hand-running
# `npm run build && firebase deploy` under time pressure and skipping steps.
#
# It intentionally does NOT touch git (no merge/pull/push) - run those
# yourself first (resolve conflicts, merge, pull), then run this script from
# the resulting main checkout to build, test, and deploy.
#
# Usage:
#   bash scripts/deploy.sh                    # full deploy: hosting + functions + firestore rules/indexes + storage
#   bash scripts/deploy.sh --only hosting      # one or more targets (comma-separated, passed to `firebase deploy --only`)
#   bash scripts/deploy.sh --skip-tests        # skip both test runs (still verifies env + build + apiKey)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_TARGETS="hosting,functions,firestore:rules,firestore:indexes,storage"
RUN_TESTS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) DEPLOY_TARGETS="$2"; shift 2 ;;
    --skip-tests) RUN_TESTS=0; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

echo "==> Repo root: $ROOT_DIR"

# .env is gitignored and per-checkout (see CLAUDE.md) - refuse to build
# without it rather than silently shipping a bundle with no Firebase config.
if [[ ! -f .env ]]; then
  echo "ERROR: .env is missing from $ROOT_DIR."
  echo "It's gitignored and per-checkout - copy it from a working checkout, e.g.:"
  echo "  cp \"../<other-smart-shop-checkout>/.env\" \"$ROOT_DIR/.env\""
  exit 1
fi

for key in REACT_APP_FIREBASE_API_KEY REACT_APP_FIREBASE_PROJECT_ID; do
  if ! grep -q "^${key}=.\+" .env; then
    echo "ERROR: $key is missing or empty in .env"
    exit 1
  fi
done
echo "==> .env present with required Firebase keys."

echo "==> Building frontend"
npm run build

# The built bundle must actually contain a non-trivial API key value, not
# just the env var name - guards against a build that silently shipped an
# empty/unset Firebase config.
if ! grep -qoE 'apiKey:"[^"]{10,}' build/static/js/main.*.js 2>/dev/null; then
  echo "ERROR: built bundle has no non-trivial Firebase apiKey - refusing to deploy."
  exit 1
fi
echo "==> Verified a real Firebase apiKey is present in the build output."

echo "==> Installing functions dependencies"
(cd functions && npm install)

if [[ "$RUN_TESTS" -eq 1 ]]; then
  echo "==> Running frontend tests (Jest via CRA)"
  CI=true npm test -- --watchAll=false

  echo "==> Running functions tests (node:test)"
  (cd functions && node --test)
else
  echo "==> Skipping tests (--skip-tests)"
fi

echo "==> Deploying: $DEPLOY_TARGETS"
npx firebase-tools deploy --only "$DEPLOY_TARGETS"

echo "==> Deploy complete."
