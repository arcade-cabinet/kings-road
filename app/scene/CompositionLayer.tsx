/**
 * CompositionLayer — renders placement arrays from src/composition/ compositors.
 *
 * Each compositor produces {assetId, position, rotation, scale} arrays.
 * This component groups them by assetId and renders each group as a single
 * GlbInstancer (one draw call per unique asset, not per placement).
 */

import { useMemo } from 'react';
import type { DungeonKitPlacement } from '@/composition/dungeon-kit';
import type { RuinsPlacement } from '@/composition/ruins';
import type { StoryPropPlacement } from '@/composition/story-props';
import type { VegetationPlacement } from '@/composition/vegetation';
import type { BuildingPlacement } from '@/composition/village';
import { GlbInstancer } from './GlbInstancer';

type AnyPlacement =
  | VegetationPlacement
  | RuinsPlacement
  | StoryPropPlacement
  | DungeonKitPlacement
  | BuildingPlacement;

interface CompositionLayerProps {
  placements: AnyPlacement[];
}

interface Bucket {
  assetId: string;
  items: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    sx: number;
    sy: number;
    sz: number;
  }[];
}

function toBuckets(placements: AnyPlacement[]): Bucket[] {
  const map = new Map<string, Bucket>();

  for (const p of placements) {
    let bucket = map.get(p.assetId);
    if (!bucket) {
      bucket = { assetId: p.assetId, items: [] };
      map.set(p.assetId, bucket);
    }

    const rotY =
      typeof p.rotation === 'number' ? p.rotation : ((p.rotation as { y?: number })?.y ?? 0);

    bucket.items.push({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      rotY,
      sx: p.scale ?? 1,
      sy: p.scale ?? 1,
      sz: p.scale ?? 1,
    });
  }

  return Array.from(map.values());
}

export function CompositionLayer({ placements }: CompositionLayerProps) {
  const buckets = useMemo(() => toBuckets(placements), [placements]);

  return (
    <>
      {buckets.map((bucket) => (
        <GlbInstancer
          key={bucket.assetId}
          glb={bucket.assetId}
          items={bucket.items}
        />
      ))}
    </>
  );
}
