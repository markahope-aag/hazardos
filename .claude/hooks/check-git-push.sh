#!/bin/bash
# Hook that detects git push commands and suggests documentation updates

# Read the tool input from stdin
INPUT=$(cat)

# Extract the command that was run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Check if this was a git push command
if [[ "$COMMAND" == *"git push"* ]]; then
  # Get the list of files changed in recent commits
  CHANGED_CODE_FILES=$(git diff --name-only HEAD~5 HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | head -20)

  if [ -n "$CHANGED_CODE_FILES" ]; then
    # Count changed files
    FILE_COUNT=$(echo "$CHANGED_CODE_FILES" | wc -l | tr -d ' ')

    # Output context for Claude
    echo "Git push detected. $FILE_COUNT code file(s) changed recently. Consider running the documenter agent to update documentation if significant features were added or modified."
  fi
fi

exit 0
