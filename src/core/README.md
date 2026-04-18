---
title: src/core
updated: 2026-04-18
status: current
domain: technical
---

# src/core — Layer 0

**Intent:** Zero-dependency primitives used across every other package. Types, math, errors. Everyone imports it; it imports nothing internal.

**Owner:** Team Foundations

**Imports from:** Nothing (zero internal dependencies)

**Exports:**

Types (`src/core/types/`):
- `Vec3` — 3D vector interface
- `EntityId`, `Seed`, `BiomeId`, `Archetype` — opaque branded string types
- `asEntityId`, `asSeed`, `asBiomeId` — safe cast helpers
- `ChunkType`, `CHUNK_TYPES`, `isChunkType`, `parseChunkType` — exhaustive chunk type union + dependency-free type guard and parser

Math (`src/core/math/`):
- `hashString`, `mulberry32`, `cyrb128`, `createRng` — deterministic PRNG / hashing
- `lerp`, `smoothstep`, `clamp`, `inverseLerp` — interpolation helpers

Errors (`src/core/errors/`):
- `ContentError`, `AssetError`, `SaveError`, `BiomeError` — named error classes

**Testing:** `pnpm test src/core` — pure functions; no external dependencies needed.
