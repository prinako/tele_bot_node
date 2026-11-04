#!/usr/bin/env bash
set -euo pipefail

# Resolve the checkout root even when called from another directory.
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_root"

if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "--dry-run" ) ]]; then
  echo "Usage: bash scripts/setup-skills.sh [--dry-run]" >&2
  exit 2
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Install Node.js and npm (including npx) before setting up skills." >&2
  exit 1
fi

if [[ ! -f skills-lock.json ]]; then
  echo "Missing skills-lock.json in the repository root." >&2
  exit 1
fi

# Restore only the project lockfile selections. Refuse upstream content drift
# rather than silently updating the reviewed lockfile. Existing skills are kept.
exec npx --yes skills@1.7.6 experimental_install --frozen-lockfile "$@"
