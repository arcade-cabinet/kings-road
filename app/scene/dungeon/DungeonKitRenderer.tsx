import { AccumulativeShadows, BakeShadows, RandomizedLight } from '@react-three/drei';
import { useMemo } from 'react';
import { DUNGEON_KIT } from '@/composition/dungeon-kit';
import type { DungeonKitPlacement } from '@/composition/dungeon-kit';
import { GlbInstancer, type GlbInstancerItem } from '../GlbInstancer';

export interface DungeonKitRendererProps {
  /** Placements from `composeDungeonRoom(...)`. */
  placements: DungeonKitPlacement[];
  /**
   * Origin of the room (world-space). Applied as a group offset so placement
   * coordinates stay local to the room center.
   */
  roomOrigin?: [number, number, number];
  /**
   * Shadow bake controls. `off` skips AccumulativeShadows entirely (mobile
   * low-end path); `static` renders once and freezes via BakeShadows (default);
   * `temporal` keeps refining over time (desktop quality path).
   */
  shadows?: 'off' | 'static' | 'temporal';
  /** Half-extent of the shadow catcher plane in world units. Default 16. */
  shadowScale?: number;
}

export interface DungeonInstanceGroup {
  assetId: string;
  assetPath: string;
  items: GlbInstancerItem[];
}

/**
 * Group a flat placement list into per-asset instance buckets, pulling the
 * GLB path from the static DUNGEON_KIT catalog. Exported for unit testing;
 * the component uses this internally and callers should not rely on it.
 */
export function groupPlacementsByAsset(
  placements: DungeonKitPlacement[],
): DungeonInstanceGroup[] {
  const groups = new Map<string, DungeonInstanceGroup>();
  for (const p of placements) {
    const kit = DUNGEON_KIT[p.assetId];
    if (!kit) continue;
    let group = groups.get(p.assetId);
    if (!group) {
      group = {
        assetId: p.assetId,
        assetPath: kit.path.replace(/^\/assets\//, ''),
        items: [],
      };
      groups.set(p.assetId, group);
    }
    group.items.push({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      sx: p.scale,
      sy: p.scale,
      sz: p.scale,
      rotY: p.rotation.y,
    });
  }
  return [...groups.values()];
}

/**
 * Render the placements produced by `composeDungeonRoom(...)`:
 *
 * - Every kit piece is rendered via `GlbInstancer` (one InstancedMesh per
 *   unique `assetId`) so a 200-placement room becomes ~20 draw calls.
 * - `AccumulativeShadows` + `RandomizedLight` layers baked soft shadows under
 *   the room — expensive on mobile, so gated behind `shadows` prop.
 * - `BakeShadows` snapshots the scene's shadow maps after one frame, avoiding
 *   per-frame shadow recomputation for an otherwise-static room.
 *
 * Intended to be mounted inside a parent `<Suspense>` boundary; the GLB loader
 * suspends until the kit assets resolve.
 */
export function DungeonKitRenderer({
  placements,
  roomOrigin = [0, 0, 0],
  shadows = 'static',
  shadowScale = 16,
}: DungeonKitRendererProps) {
  const groups = useMemo(() => groupPlacementsByAsset(placements), [placements]);

  if (groups.length === 0) return null;

  return (
    <group position={roomOrigin}>
      {groups.map((g) => (
        <GlbInstancer key={g.assetPath} glb={g.assetPath} items={g.items} />
      ))}

      {shadows !== 'off' && (
        <AccumulativeShadows
          temporal={shadows === 'temporal'}
          frames={shadows === 'temporal' ? 60 : 40}
          alphaTest={0.85}
          scale={shadowScale}
          position={[0, 0.01, 0]}
          color="#1a1a22"
          opacity={0.75}
        >
          <RandomizedLight
            amount={8}
            radius={4}
            ambient={0.5}
            intensity={1}
            position={[0, 6, 0]}
            bias={0.001}
          />
        </AccumulativeShadows>
      )}

      {/*
       * BakeShadows freezes shadow-map updates after the first frame. Mount it
       * ONLY in the 'static' budget — 'off' skips all shadow work, 'temporal'
       * needs continuous updates for AccumulativeShadows to keep refining and
       * for any dynamic castShadow lights to keep casting.
       */}
      {shadows === 'static' && <BakeShadows />}
    </group>
  );
}
