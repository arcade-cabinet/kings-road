---
title: PBR Loader Test Fixtures
updated: 2026-04-18
status: current
domain: quality
---

# PBR Loader Test Fixtures

Small synthetic PBR packs used exclusively in unit tests.
These are not shipped to production — Vite tree-shakes test-only imports.

## test-stone/

A minimal 4-map pack (color, normal, roughness, displacement) using 1×1 pixel
PNG data URIs. Used by `loader.test.ts` to verify MeshStandardMaterial binding
without requiring real assets.
