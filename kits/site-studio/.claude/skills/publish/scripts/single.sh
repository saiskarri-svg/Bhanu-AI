#!/usr/bin/env bash
# Rebuild ../<Name>.html (one self-contained file) and ../<Name>-clean.zip.
# <Name> is SITE_NAME, or the name in package.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
PARENT="$(dirname "$ROOT")"
NAME="${SITE_NAME:-$(node -p "require('$ROOT/package.json').name")}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP" "$ROOT/vite.single.config.ts"' EXIT

cat > "$ROOT/vite.single.config.ts" <<'EOF'
import base from './vite.config';
export default (env: any) => ({ ...(base as any)(env), build: { rollupOptions: { output: { inlineDynamicImports: true } } } });
EOF
(cd "$ROOT" && npx vite build -c vite.single.config.ts --outDir "$TMP" --emptyOutDir > "$TMP/build.log" 2>&1) || { cat "$TMP/build.log"; exit 1; }

python3 - "$TMP" "$PARENT/$NAME.html" <<'PY'
import glob, re, sys
d, dest = sys.argv[1], sys.argv[2]
h = open(d + '/index.html').read()
css = open(glob.glob(d + '/assets/*.css')[0]).read()
js = open(glob.glob(d + '/assets/*.js')[0]).read().replace('</script', '<\\/script')
h = re.sub(r'<link rel="stylesheet"[^>]*assets/[^>]*>', lambda m: '<style>' + css + '</style>', h)
h = re.sub(r'<script type="module" crossorigin src="[^"]*"></script>', lambda m: '<script type="module">' + js + '</script>', h)
assert not re.search(r'(src|href)="(\./)?assets/', h), 'an asset was not inlined'
open(dest, 'w').write(h)
print('wrote', dest, len(h) // 1024, 'KB')
PY

# Open it once to make sure it runs
node - "$PARENT/$NAME.html" <<'JS'
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
rm -f $NAME-clean.zip
zip -qr $NAME-clean.zip "$(basename "$ROOT")" -x "*/node_modules/*" "*/dist/*" "*/.publish/*"
echo "zipped $PARENT/$NAME-clean.zip"
