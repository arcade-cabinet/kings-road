# Full Check

Run all quality checks: lint, types, tests, content validation.

```bash
pnpm exec biome check .
pnpm tsc --noEmit
pnpm test
npx tsx scripts/validate-trove.ts
```

Report results for each step. If any step fails, stop and report the failure.
