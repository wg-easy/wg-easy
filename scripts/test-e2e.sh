#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export E2E_RUN_DIR
E2E_RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wg-easy-e2e.XXXXXX")"
touch "$E2E_RUN_DIR/projects"

cleanup() {
  local project
  while IFS= read -r project; do
    docker compose --env-file /dev/null -f "$repo_root/docker-compose.test.yml" \
      -p "$project" down --volumes --remove-orphans >/dev/null 2>&1 || true
  done < "$E2E_RUN_DIR/projects"
  rm -rf "$E2E_RUN_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker build -t wg-easy-e2e:local "$repo_root"

cd "$repo_root/src"
pnpm exec playwright test "$@"
