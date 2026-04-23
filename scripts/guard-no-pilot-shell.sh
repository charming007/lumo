#!/usr/bin/env bash
set -euo pipefail
files=(
  "apps/lms-web/lib/navigation.ts"
  "apps/lms-web/components/sidebar.tsx"
  "apps/lms-web/components/topbar.tsx"
)
patterns=(
  "Pilot workspace"
  "pilot nav"
  "pilot shell"
  "launch routes"
  "launch shell"
  "pilot control plane"
)
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  for p in "${patterns[@]}"; do
    if grep -qi "$p" "$f"; then
      echo "Blocked: pilot-shell pattern '$p' found in $f"
      exit 1
    fi
  done
done
