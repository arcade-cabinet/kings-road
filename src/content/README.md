---
title: src/content
updated: 2026-04-18
status: current
domain: technical
---

# src/content — Layer 1

**Intent:** Single import surface for all content: Zod schemas, JSON queries, and the compiled DB query layer.

**Owner:** Team Foundations

**Imports from:** `core` (transitively via schemas), `@/schemas`, `@/db`

**Exports:**

- All Zod schemas and inferred types from `src/schemas/` (re-exported wholesale)
- Content query functions from `src/db/content-queries`:
  `getMonster`, `getAllMonsters`, `getMonstersByTier`, `getItem`, `getAllItems`, `getItemsByType`,
  `getEncounterTable`, `getLootTable`, `getLootTableByTier`, `getNamedNpc`, `getAllNamedNpcs`,
  `getNpcPool`, `getAllNpcPools`, `getBuilding`, `getAllBuildings`, `getTown`, `getAllTowns`,
  `getFeature`, `getAllFeatures`, `getFeaturesByTier`, `getQuest`, `getAllQuests`,
  `getDungeon`, `getAllDungeons`, `getEncounter`, `getEncountersByType`,
  `getRoadSpine`, `getPacingConfig`, `initContentStore`, `isContentStoreReady`

**Testing:** `pnpm test src/schemas` (schema tests) + `pnpm test src/db` (query integration tests)

**Note:** This is a barrel-only package. Schema files live in `src/schemas/`, query code in `src/db/`. No files have been moved — this barrel provides the canonical import path consumers should use going forward.
