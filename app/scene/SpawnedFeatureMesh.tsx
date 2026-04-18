import { useMemo } from 'react';
import { hashString } from '@/core';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import { GlbInstancer } from './GlbInstancer';

interface SpawnedFeatureMeshProps {
  id: string;
  definition: FeatureDefinition;
  position: [number, number, number];
  rotation: number;
}

/**
 * Renders a single spawned feature via GlbInstancer (one InstancedMesh, one draw call).
 * All visible surfaces use authored GLBs — no primitive color materials.
 */
export function SpawnedFeatureMesh({ id, definition, position, rotation }: SpawnedFeatureMeshProps) {
  if (!definition.glb) {
    throw new Error(
      `SpawnedFeatureMesh: "${definition.id}" has no glb — every feature ` +
        `definition must declare an authored GLB.`,
    );
  }

  const { tierScale, yawOffset } = useMemo(() => {
    const ts = definition.tier === 'major' ? 1.5 : definition.tier === 'minor' ? 1.0 : 0.6;
    const h = hashString(id);
    const yaw = ((h % 360) / 360) * definition.glbYawRange * (Math.PI / 180);
    return { tierScale: ts, yawOffset: yaw };
  }, [id, definition.tier, definition.glbYawRange]);

  const scale = tierScale * definition.glbScale;
  const items = useMemo(
    () => [{ x: position[0], y: position[1], z: position[2], rotY: rotation + yawOffset, sx: scale, sy: scale, sz: scale }],
    [position, rotation, yawOffset, scale],
  );

  return <GlbInstancer glb={definition.glb} items={items} />;
}
