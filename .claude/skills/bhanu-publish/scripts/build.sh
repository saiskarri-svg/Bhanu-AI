#!/usr/bin/env bash
# Build Bhanu AI into .publish/ and print the Artifact `files` map.
# Usage: build.sh [published asset paths to retire...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
OUT="${PUBLISH_DIR:-$ROOT/.publish}"
mkdir -p "$OUT"
rm -rf "$OUT/assets"
(cd "$ROOT" && npx vite build --outDir "$OUT" --emptyOutDir=false > "$OUT/build.log" 2>&1) || { cat "$OUT/build.log"; exit 1; }
rm -f "$OUT/index.html"

JS="$(cd "$OUT/assets" && ls index-*.js)"
CSS="$(cd "$OUT/assets" && ls index-*.css)"
cat > "$OUT/page.html" <<EOF
<title>Bhanu AI</title>
<meta name="theme-color" content="#0b0b0d">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Saira:wght@500;600&display=swap">
<link rel="stylesheet" href="assets/$CSS">
<div id="root"></div>
<script type="module" src="assets/$JS"></script>
EOF

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
