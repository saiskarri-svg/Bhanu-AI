#!/usr/bin/env bash
# Rebuild ../Bhanu-AI.html (one self-contained file) and ../Bhanu-AI-clean.zip.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
PARENT="$(dirname "$ROOT")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP" "$ROOT/vite.single.config.ts"' EXIT

cat > "$ROOT/vite.single.config.ts" <<'EOF'
import base from './vite.config';
export default (env: any) => ({ ...(base as any)(env), build: { rollupOptions: { output: { inlineDynamicImports: true } } } });
EOF
(cd "$ROOT" && npx vite build -c vite.single.config.ts --outDir "$TMP" --emptyOutDir > "$TMP/build.log" 2>&1) || { cat "$TMP/build.log"; exit 1; }

python3 - "$TMP" "$PARENT/Bhanu-AI.html" <<'PY'
import glob, re, sys
d, dest = sys.argv[1], sys.argv[2]
h = open(d + '/index.html').read()
css = open(glob.glob(d + '/assets/*.css')[0]).read()
js = open(glob.glob(d + '/assets/*.js')[0]).read().replace('</script', '<\\/script')
h = re.sub(r'<link rel="stylesheet"[^>]*assets/[^>]*>', lambda m: '<style>' + css + '</style>', h)
h = re.sub(r'<script type="module" crossorigin src="[^"]*"></script>', lambda m: '<script type="module">' + js + '</script>', h)
assert 'assets/' not in h, 'an asset was not inlined'
open(dest, 'w').write(h)
print('wrote', dest, len(h) // 1024, 'KB')
PY

# Open it once to make sure it runs
node - "$PARENT/Bhanu-AI.html" <<'JS'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  console.log('tabs:', await p.getByRole('tab').count(), 'errors:', errs.length ? errs : 'none');
  await b.close();
  if (errs.length) process.exit(1);
})();
JS

cd "$PARENT"
rm -f Bhanu-AI-clean.zip
zip -qr Bhanu-AI-clean.zip "$(basename "$ROOT")" -x "*/node_modules/*" "*/dist/*" "*/.publish/*"
echo "zipped $PARENT/Bhanu-AI-clean.zip"
