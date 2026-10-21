#!/usr/bin/env bash
# Halfway through a session, ask the main session to run the ui-improver agent.
# "Halfway" = the Nth prompt of the session (BHANU_IDEAS_AT_PROMPT, default 6).
# Fires once per session.
input=$(cat)
session=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')
at=${BHANU_IDEAS_AT_PROMPT:-6}
state="${TMPDIR:-/tmp}/bhanu-ideas-$session"

count=$(( $(cat "$state" 2>/dev/null || echo 0) + 1 ))
echo "$count" > "$state"

if [ "$count" -eq "$at" ]; then
  cat <<MSG
[Midpoint ideas] This session is about halfway through. After you finish what Sai just asked (including the usual report and link), launch the ui-improver agent in the background to suggest website and UI improvements. When it returns, show Sai its batch table and screenshots in the idea-batches format and wait for their choice.
MSG
fi
exit 0
