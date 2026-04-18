import { describe, expect, it } from 'vitest';
import type { DungeonKitPlacement } from '@/composition/dungeon-kit';
import { groupPlacementsByAsset } from '../DungeonKitRenderer';

function placement(
  assetId: string,
  x = 0,
  z = 0,
  rotY = 0,
  scale = 1,
): DungeonKitPlacement {
  return {
    assetId,
    position: { x, y: 0, z },
    rotation: { x: 0, y: rotY, z: 0 },
    scale,
    role: 'floor',
  };
}

describe('groupPlacementsByAsset', () => {
  it('returns empty array for empty input', () => {
    expect(groupPlacementsByAsset([])).toEqual([]);
  });

  it('groups same-asset placements into one bucket preserving order', () => {
    const groups = groupPlacementsByAsset([
      placement('floor-large', 0, 0),
      placement('floor-large', 2, 0),
      placement('floor-large', 4, 0),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].assetId).toBe('floor-large');
    expect(groups[0].items.map((i) => i.x)).toEqual([0, 2, 4]);
  });

  it('splits distinct assets into separate buckets', () => {
    const groups = groupPlacementsByAsset([
      placement('floor-large', 0, 0),
      placement('wall-straight', 2, 0),
      placement('floor-large', 4, 0),
    ]);
    const ids = groups.map((g) => g.assetId).sort();
    expect(ids).toEqual(['floor-large', 'wall-straight']);
    const floor = groups.find((g) => g.assetId === 'floor-large');
    expect(floor?.items).toHaveLength(2);
  });

  it('strips the /assets/ prefix from the kit path for GlbInstancer', () => {
    const [group] = groupPlacementsByAsset([placement('ceiling-tile')]);
    expect(group.assetPath.startsWith('/')).toBe(false);
    expect(group.assetPath).toMatch(/dungeon\/kit\/ceiling-tile\.glb$/);
  });

  it('skips placements that reference unknown asset ids', () => {
    const groups = groupPlacementsByAsset([
      placement('wall-straight'),
      placement('does-not-exist'),
      placement('wall-straight'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it('maps placement transform fields onto GlbInstancerItem shape', () => {
    const [group] = groupPlacementsByAsset([
      placement('scatter-torch', 1, 2, Math.PI / 2, 0.75),
    ]);
    const item = group.items[0];
    expect(item.x).toBe(1);
    expect(item.z).toBe(2);
    expect(item.rotY).toBeCloseTo(Math.PI / 2);
    expect(item.sx).toBeCloseTo(0.75);
    expect(item.sy).toBeCloseTo(0.75);
    expect(item.sz).toBeCloseTo(0.75);
  });
});
