#!/usr/bin/env bash
# Build GridSight and write dist/page.html, the page published to the artifact
# (it links the built CSS and JS, which are published alongside as files).
set -e
cd "$(dirname "$0")/app"
rm -rf dist && npx vite build >/dev/null
JS=$(ls dist/assets/*.js | head -1 | sed 's#dist/##'); CSS=$(ls dist/assets/*.css | head -1 | sed 's#dist/##')
cat > dist/page.html <<HTML
<title>GridSight</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@500;600&display=swap">
<link rel="stylesheet" href="./$CSS">
<div id="root"></div>
<script type="module" src="./$JS"></script>
HTML
echo "page.html -> $JS $CSS"
