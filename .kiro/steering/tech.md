# Tech Stack

## Core

| Layer | Tech |
|-------|------|
| Rendering | React Three Fiber + drei + postprocessing |
| ECS | Koota (pmndrs) |
| Schemas | Zod 4 |
| State | Zustand (legacy — new features use Koota ECS) |
| UI | React 19, Tailwind CSS v4 |
| Build | Vite 7, TypeScript 5.9 |
| Testing | Vitest (unit), Playwright (e2e + component) |
| Formatting | Biome (single quotes, semicolons, 2-space indent) |
| Audio | Tone.js |
| Physics | @react-three/rapier |
| Package manager | pnpm |
| Mobile | Expo / React Native (secondary target) |

## Path Alias

`@/*` maps to `src/*` (configured in tsconfig and vite).

## Commands

```bash
pnpm dev                              # Dev server (localhost:5173)
pnpm build                            # Production build
pnpm test                             # Vitest unit tests (single run)
pnpm test:watch                       # Vitest watch mode
pnpm test:coverage                    # Coverage report
pnpm test:e2e                         # Playwright e2e
pnpm test:ct                          # Playwright component tests
pnpm tsc --noEmit                     # Type check
npx tsx scripts/validate-trove.ts     # Validate content JSON against schemas
npx tsx scripts/validate-content.ts   # Content validation
```

## Code Style (Biome)

- Single quotes, always semicolons
- 2-space indentation
- `noExplicitAny: off`, `noNonNullAssertion: off`
- Unused vars/imports are warnings, not errors
- Organize imports on save

## Key Conventions

- New game state goes in Koota ECS traits, not Zustand
- Use `useFrame` for animation/physics loops, never `setInterval`/`requestAnimationFrame`
- Access Three.js objects via refs, never store in React state
- Static geometry uses `THREE.InstancedMesh`
- Dispose dynamic geometries/materials on unmount
- Do not create new React context providers — use Koota or Zustand
- Schema types are inferred: `z.infer<typeof SchemaName>`
