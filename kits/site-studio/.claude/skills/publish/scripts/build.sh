#!/usr/bin/env bash
# Build the site into .publish/ and print the Artifact `files` map.
# The page head (title, theme colour, Google Fonts) is copied from index.html.
# Usage: build.sh [published asset paths to retire...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
OUT="${PUBLISH_DIR:-$ROOT/.publish}"
mkdir -p "$OUT"
rm -rf "$OUT/assets"
(cd "$ROOT" && npx vite build --outDir "$OUT" --emptyOutDir=false > "$OUT/build.log" 2>&1) || { cat "$OUT/build.log"; exit 1; }
rm -f "$OUT/index.html"

JS="$(cd "$OUT/assets" && ls index-*.js)"
CSS="$(cd "$OUT/assets" && ls index-*.css 2>/dev/null || true)"
HEAD="$(grep -oE '<title>[^<]*</title>|<meta name="theme-color"[^>]*>|<link[^>]*fonts\.googleapis[^>]*>' "$ROOT/index.html" || true)"
{
  echo "$HEAD"
  [ -n "$CSS" ] && echo "<link rel=\"stylesheet\" href=\"assets/$CSS\">"
  echo '<div id="root"></div>'
  echo "<script type=\"module\" src=\"assets/$JS\"></script>"
} > "$OUT/page.html"

python3 - "$OUT" "$@" <<'PY'
import json, os, sys
out, old = sys.argv[1], sys.argv[2:]
new = sorted("assets/" + f for f in os.listdir(os.path.join(out, "assets")))
files = {p: p for p in new}
for p in old:
    if p not in files:
        files[p] = None
print(json.dumps(files, indent=1))
PY
