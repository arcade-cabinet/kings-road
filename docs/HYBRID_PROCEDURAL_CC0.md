---
title: Hybrid Procedural CC0 Rendering
updated: 2026-04-18
status: current
domain: technical
---

# Hybrid Procedural CC0 Rendering (React Three Fiber)

**Context:** This technique bridges the gap between infinite procedural generation and high-fidelity handcrafted CC0 assets (like the 3DPSX mega packs).

## The Problem
Procedural generation often relies on primitive shapes (boxes, spheres) because they are mathematically easy to generate and position. However, this results in a "Lego-block" aesthetic. Conversely, handcrafted models are beautiful but static.

## The Solution: Hybrid Extraction
Instead of loading individual `.glb` files for every tiny prop or building variant, we can load a single "Mega Pack" `.glb` (e.g., `Village_Buildings.glb` or `MineProps.glb`) using `@react-three/drei`'s `useGLTF` hook, extract the individual nodes (meshes), and then procedurally map those nodes to our generated logic.

### Standard Operating Procedure for AI Agents:

1. **Locate the Mega Pack:** Find the appropriate `.glb` in the `/Volumes/home/assets/` directory (check the local `CATALOG.md` files).
2. **Transform & Optimize:** (Optional but recommended) Run `npx gltfjsx [model.glb] --transform` to generate a compressed `.glb` and a React component that exposes the internal node structure.
3. **Load via `useGLTF`:** Load the `.glb` once at the component level.
4. **Extract Nodes:** Access the `nodes` object returned by `useGLTF`. Mega packs usually contain distinct meshes like `nodes.Cube001`, `nodes.Barrel`, `nodes.Wall_Corner`.
5. **Procedural Mapping:** Use the procedural engine's data (e.g., a deterministic seed based on world coordinates) to select *which* node to render.
6. **Render via `primitive` or `mesh`:**
   - **Method A (Direct Geometry):** Render a `<mesh>` and pass the specific geometry and material.
     ```tsx
     <mesh geometry={nodes.Cube001.geometry} material={materials.Wood} />
     ```
   - **Method B (Clone):** If you need the entire sub-tree, clone the scene.
     ```tsx
     const clonedNode = useMemo(() => nodes.SpecificProp.clone(), [nodes]);
     <primitive object={clonedNode} />
     ```

### Example Implementation

```tsx
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

const GLB_PATH = '/assets/buildings/Village_Buildings.glb';

export function ProceduralBuilding({ seed, position }) {
  const { nodes, materials } = useGLTF(GLB_PATH) as any;

  // Deterministically select a building variant from the mega-pack
  const variants = useMemo(() => [
    { base: nodes.Cube001, win: nodes.Cube001_1, door: nodes.Cube001_2 },
    { base: nodes.Cube002, win: nodes.Cube002_1, door: nodes.Cube002_2 },
  ], [nodes]);

  const variant = variants[seed % variants.length];

  return (
    <group position={position}>
      <mesh geometry={variant.base.geometry} material={materials.House_Wood} />
      <mesh geometry={variant.win.geometry} material={materials.Window} />
      <mesh geometry={variant.door.geometry} material={materials.Door} />
    </group>
  );
}

useGLTF.preload(GLB_PATH);
```

### Benefits
- **Performance:** Only one HTTP request for the Mega Pack. `useGLTF` caches the parsed geometry.
- **Visuals:** High-fidelity CC0 assets replace primitive shapes.
- **Variety:** Deterministic selection creates the illusion of infinite handcrafted variety.