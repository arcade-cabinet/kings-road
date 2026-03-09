#!/bin/bash
# Post-edit hook: run TypeScript check on modified .ts/.tsx files
FILE="$CLAUDE_FILE_PATH"

if [[ "$FILE" == *.ts ]] || [[ "$FILE" == *.tsx ]]; then
  pnpm tsc --noEmit 2>&1 | head -20
fi
