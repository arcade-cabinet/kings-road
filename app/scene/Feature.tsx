/**
 * Feature — renders a placed feature (shrine, ruin, standing stone, etc.)
 * from the authored GLB declared on its FeatureDefinition. Every feature
 * definition must declare a `glb` field; missing definitions throw to
 * ErrorOverlay rather than rendering silent primitives.
 */

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assetUrl } from '@/lib/assets';
import { hashString } from '@/utils/random';
import type { PlacedFeatureData } from '@/types/game';

export function Feature({ feature }: { feature: PlacedFeatureData }) {
  if (!feature.definition.glb) {
    throw new Error(
      `Feature "${feature.id}" (visualType=${feature.definition.visualType}) ` +
        `is missing the 'glb' field. Every feature definition must declare ` +
        `an authored GLB — add it to src/content/features/<id>.json.`,
    );
  }
  return <AuthoredFeature feature={feature} />;
}

function AuthoredFeature({ feature }: { feature: PlacedFeatureData }) {
  const { glb, glbScale, glbYawRange, tier } = feature.definition;
  const gltf = useGLTF(assetUrl(`/assets/${glb}`));
  const tierScale = tier === 'major' ? 1.5 : tier === 'minor' ? 1.0 : 0.6;
  const scale = tierScale * (glbScale ?? 1);

  const yawOffset = useMemo(() => {
    const h = hashString(feature.id);
    return ((h % 360) / 360) * (glbYawRange ?? 360) * (Math.PI / 180);
  }, [feature.id, glbYawRange]);

  const sceneInstance = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <primitive
      object={sceneInstance}
      position={feature.worldPosition}
      rotation={[0, feature.rotation + yawOffset, 0]}
      scale={scale}
    />
  );
}
