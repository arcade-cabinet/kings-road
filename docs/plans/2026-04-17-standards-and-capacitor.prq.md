---
title: Standards + Capacitor swap + Vitest browser harness
updated: 2026-04-18
status: current
domain: context
---

# PRD: Kings Road — Standards, Capacitor swap, browser tests

**Priority**: P0
**Branch**: `feat/standards-capacitor-vitest` off `main`
**Config**: stop_on_failure=false, auto_commit=true

## Overview

Three things, one branch:

1. **Merge PR backlog.** 14 PRs open, all failing `Test & Lint`. Fix CI, merge PR #30 (docs), burn down dependabot.
2. **Swap Expo wrapper → Capacitor wrapper.** Expo in this repo is *thin*: 3 files in `app/`, 1 `fiber/native` import, `app.json`, `metro.config.js`, package.json deps. HUD/UI all live in `src/game/components/ui/` (36 files) and are already plain React — they don't change. Web toolchain becomes Vite (not Expo web). Native shell becomes Capacitor wrapping the Vite `dist/`. Reference repos: `../grailguard`, `../mean-streets`, `../midway-mayhem`.
3. **Vitest browser harness.** Port grailguard's `vitest.browser.config.ts`. Add one browser smoke test per major HUD surface; record visual bugs in `docs/visual-bugs.md`. Do NOT fix bugs in this PR.

Plus: global-standards gap-fill (frontmatter, ci/release/cd split, release-please, gitignore, 300-LOC check). Done inline, not as a separate phase.

## Success Criteria

- `main` green CI on a fresh commit.
- Every PR open at batch start merged or closed-with-reason.
- No `expo*`/`react-native*`/`metro*` in `package.json`; no `app/`, `app.json`, `metro.config.js`, `expo-env.d.ts`; zero `@react-three/fiber/native` imports.
- `capacitor.config.ts` + `android/` + `ios/` scaffolded. `pnpm build:native && pnpm cap:sync android` succeeds.
- Vite web works: `pnpm dev` at `localhost:5173`, `pnpm build` → `dist/`.
- `pnpm test:browser` boots Chromium with WebGL flags and runs ≥6 surface smoke tests.
- `docs/visual-bugs.md` exists with findings.
- All root + `docs/` markdown has `title/updated/status/domain` frontmatter.
- `.github/workflows/` has `ci.yml`, `release.yml`, `cd.yml`, `release-please.yml`, `dependabot-auto-merge.yml`.
- `pending-integration/*.zip` gitignored.

## Tasks

Sequential by default; parallel-safe groups noted.

### T01 — Diagnose CI failure locally

Check out `main`, run `pnpm install --frozen-lockfile && pnpm exec biome check . && pnpm tsc --noEmit && pnpm test && npx tsx scripts/validate-trove.ts`. Record failing step + error. Criteria: root cause identified.

### T02 — Branch + fix CI

Branch `feat/standards-capacitor-vitest` off `docs/standardize-documentation` (current). Fix CI root cause. Commit + push. Criteria: local CI commands pass.

### T03 — Merge PR #30 with CI fix on top

Push T02 fix onto PR #30's branch. Wait for green. Squash-merge. Pull `main`. Criteria: PR #30 merged, `main` updated.

### T04 — Rebranch cleanly off new main

Delete local `feat/standards-capacitor-vitest`; re-create from updated `main`. Criteria: branch tracks `main`.

### T05 — Close Expo-adjacent dependabot PRs

Close with comment "Superseded: Expo being removed." on any PR touching `expo-*`, `react-native*`, `metro*`, `@react-three/fiber/native`. (Includes #23 expo-sqlite, #18 react-native, #20 react-native-screens.) Criteria: all such PRs closed.

### T06 — Rebase + merge non-Expo dependabot PRs

For each remaining PR: `gh pr merge --rebase` if possible, wait for CI, squash. Skip if rebase conflicts — close with "Dependabot will re-open." Criteria: zero open dependabot PRs.

### T07 — Add dependabot-auto-merge workflow

Copy `.github/workflows/dependabot-auto-merge.yml` from grailguard. Criteria: workflow file valid.

### T08 — Frontmatter sweep + gitignore

Add `title/updated/status/domain` frontmatter to every `.md` in root + `docs/`. Add `pending-integration/*.zip`, `config/game.db`, `public/game.db` to `.gitignore`. Criteria: grep confirms frontmatter present; `git status` clean after `pnpm compile:db`.

### T09 — Split workflows into ci/release/cd/release-please

Port grailguard's `release.yml`, `cd.yml`, `release-please.yml`, plus `release-please-config.json` + `.release-please-manifest.json`. Keep existing `ci.yml` (it works once T02 fixes it). Criteria: files valid, release-please dry-run succeeds.

### T10 — Remove Expo from package.json

Delete from deps: all `expo-*`, `react-native*`, `@react-three/fiber/native` usage (the import, not the package — fiber stays). Remove `"main": "expo-router/entry"`. Remove scripts `native:*`, `dev:native`, change `dev`/`build`/`predev`/`prebuild` to Vite equivalents. `pnpm install`. Criteria: no expo/rn strings in package.json.

### T11 — Delete Expo wrapper files

`rm -rf app/ app.json metro.config.js expo-env.d.ts`. Remove any Expo entries from `tsconfig.json` excludes. Criteria: files gone, tsc --noEmit passes.

### T12 — Add Vite config + entry point

`vite.config.ts` modeled on grailguard (plain React + sql.js WASM copy). `index.html` at root pointing at `src/main.tsx`. Create `src/main.tsx` that mounts `<App/>` — the existing `App.tsx` already exists from pre-Expo days or needs minimal shim. Criteria: `pnpm dev` renders main menu at `localhost:5173`.

### T13 — Swap `@react-three/fiber/native` → `@react-three/fiber`

Exactly one import site (`app/index.tsx`, already deleted in T11). Verify no other occurrences. Canvas imports route through `src/game/components/GameScene.tsx` which already uses web fiber. Criteria: `grep -r "fiber/native" src/` returns 0.

### T14 — Replace expo-sqlite in src/db/

Files: `src/db/load-content-db.ts`, `src/db/save-service.ts`. Port grailguard pattern: `sql.js` for web, `@capacitor-community/sqlite` for native, detect via `Capacitor.isNativePlatform()`. Criteria: `pnpm build` + existing db unit tests pass.

### T15 — Add Capacitor deps + config

`pnpm add @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/app @capacitor-community/sqlite jeep-sqlite sql.js`. Create `capacitor.config.ts` (appId `com.arcadecabinet.kingsroad`, webDir `dist`). Criteria: `pnpm cap --version` works.

### T16 — Scaffold android/ and ios/

`pnpm exec cap add android && pnpm exec cap add ios`. Commit generated projects. Criteria: `pnpm build:native && pnpm cap:sync android` succeeds.

### T17 — Add native build scripts

Port grailguard's `build:native`, `cap:sync`, `native:android:debug`, `native:ios:build` scripts. Criteria: `pnpm build:native` produces dist/ with `CAPACITOR=true`.

### T18 — Verify drei + postprocessing; add minimal EffectComposer

Already in deps (drei ^10.7.7, postprocessing ^6.38.3, @react-three/postprocessing ^3.0.4). Add `src/game/components/PostProcessing.tsx` with subtle Bloom + Vignette. Gate via settings store; default on desktop, off mobile. Criteria: `pnpm dev` renders scene with post-processing.

### T19 — Add vitest.browser.config.ts

Port grailguard's file verbatim. Add `@vitest/browser`, `@vitest/browser-playwright` deps. Add `pretest:browser` sql.js WASM copy. Add `test:browser` script. Criteria: `pnpm test:browser` boots Chromium without infra errors.

### T20 — Write 6 surface smoke tests

`src/game/components/ui/__tests__/*.browser.test.tsx`: MainMenu, LoadingOverlay, GameHUD, CombatHUD, DialogueBox, InventoryScreen. Each: mounts surface, asserts renders, captures console errors. Follow grailguard R3F-in-browser pattern for any that need a Canvas wrapper. Criteria: 6 test files; `pnpm test:browser` runs them.

### T21 — Write docs/visual-bugs.md from test output

For each failing assertion or console error: record surface + symptom + repro. Do not fix. Criteria: file has one section per surface.

### T22 — Add test:browser to CI

Append step to `ci.yml` with `continue-on-error: true` and artifact upload on failure. Criteria: CI workflow validates.

### T23 — Update docs for Capacitor reality

`CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`: strip Expo/Metro mentions; document Capacitor + Vite + browser test flow. Criteria: `grep -iE "expo|metro" CLAUDE.md README.md docs/*.md` returns nothing.

### T24 — Open PR

Push, open `feat: standards compliance, Capacitor swap, browser visual tests`. Body lists changes + links this PRD. Criteria: PR open, CI running.

## Dependencies

```
T01 → T02 → T03 → T04
T04 → T05, T06, T07 (parallel)
T04 → T08, T09 (parallel with above)
T04 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
T18 → T19 → T20 → T21 → T22
T22 → T23 → T24
```

## Risks

- Capacitor iOS scaffold needs Xcode; if unavailable, commit iOS folder as best-effort, Android must work.
- sql.js save persistence: mirror grailguard (IndexedDB for saves). If divergent, file as follow-up, don't block.
- WebGL in headless Chromium flakes — use SwiftShader flags from grailguard's config.
- `scripts/validate-trove.ts` referenced in CI — verify it exists during T01, fix or rename if stale.
