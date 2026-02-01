#!/bin/bash
# Hook that runs at the end of Claude's response to check if docs need updating

# Check for uncommitted changes to code files (not docs)
UNCOMMITTED_CODE=$(git status --porcelain 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | grep -v '/docs/' | head -10)

# Check for recent commits that might need doc updates
RECENT_COMMITS=$(git log --oneline -3 --since="1 hour ago" 2>/dev/null | grep -v "^.*docs:" | head -3)

# Only output if there are significant changes
if [ -n "$UNCOMMITTED_CODE" ] || [ -n "$RECENT_COMMITS" ]; then
  # Count items
  CODE_COUNT=$(echo "$UNCOMMITTED_CODE" | grep -c . 2>/dev/null || echo "0")
  COMMIT_COUNT=$(echo "$RECENT_COMMITS" | grep -c . 2>/dev/null || echo "0")

  if [ "$CODE_COUNT" -gt 5 ] || [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "Note: $CODE_COUNT uncommitted code files and $COMMIT_COUNT recent non-doc commits detected. Documentation may need updating."
  fi
fi

exit 0
