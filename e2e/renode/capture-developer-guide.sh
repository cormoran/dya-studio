#!/usr/bin/env bash
# Generate the light-mode screenshots used by the static developer guide.
# The app's built-in Demo keyboard keeps this independent of physical hardware
# and the optional Renode firmware harness.
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
output_dir="$repo_root/public/images/developer-guide/light-mode"

mkdir -p "$output_dir"

for name in keymap macro combo trackball connection settings troubleshooting; do
  if [ -e "$output_dir/$name.png" ]; then
    echo "Refusing to overwrite existing asset: $output_dir/$name.png" >&2
    echo "Move the approved asset away before deliberately recapturing it." >&2
    exit 1
  fi
done

npm --prefix "$repo_root" run build
cd "$script_dir"
export DIST_DIR="$repo_root/dist"
npx playwright test tests/developer-guide-screenshots.spec.ts
