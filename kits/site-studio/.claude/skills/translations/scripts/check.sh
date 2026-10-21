#!/usr/bin/env bash
# Check every translations/<lang>.md lines up with en.md: same headings and bullets on the same lines.
set -euo pipefail
DIR="${1:-$(cd "$(dirname "$0")/../../../.." && pwd)/translations}"
shape() { sed 's/[^#-].*//' "$1"; }
status=0
for f in "$DIR"/*.md; do
  l="$(basename "$f" .md)"; [ "$l" = en ] && continue
  if diff <(shape "$DIR/en.md") <(shape "$f") > "/tmp/align-$l.diff"; then
    echo "$l.md aligned ($(wc -l < "$f") lines)"
  else
    echo "$l.md NOT aligned. First differences (line numbers):"; head -10 "/tmp/align-$l.diff"; status=1
  fi
done
exit $status
