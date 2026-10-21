#!/usr/bin/env bash
# Check that te.md and hi.md line up with en.md: same headings and bullets on the same lines.
set -euo pipefail
DIR="${1:-$(cd "$(dirname "$0")/../../../.." && pwd)/translations}"
shape() { sed 's/[^#-].*//' "$1"; }
status=0
for l in te hi; do
  if diff <(shape "$DIR/en.md") <(shape "$DIR/$l.md") > /tmp/bhanu-align-$l.diff; then
    echo "$l.md aligned ($(wc -l < "$DIR/$l.md") lines)"
  else
    echo "$l.md NOT aligned. First differences (line numbers):"
    head -10 /tmp/bhanu-align-$l.diff
    status=1
  fi
done
exit $status
