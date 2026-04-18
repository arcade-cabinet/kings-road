import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { hashString } from '@/factories/chibi-generator';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

const ASSETS = {
  tree_large: `${BASE_URL}/assets/nature/tree01.glb`,
  tree_medium: `${BASE_URL}/assets/nature/tree07.glb`,
  tree_small: `${BASE_URL}/assets/nature/tree15.glb`,
  bush_1: `${BASE_URL}/assets/nature/bush01.glb`,
  bush_2: `${BASE_URL}/assets/nature/bush05.glb`,
};

interface FoliageProps {
  type: 'pine' | 'oak' | 'bush';
  position: [number, number, number];
  seed: string;
  scale?: number;
}

export function Foliage({ type, position, seed, scale = 1 }: FoliageProps) {
  const hash = useMemo(() => hashString(seed), [seed]);

  // Deterministically select an asset variant
  let assetPath = ASSETS.tree_large;
  if (type === 'pine') {
    assetPath = hash % 2 === 0 ? ASSETS.tree_large : ASSETS.tree_medium;
  } else if (type === 'oak') {
    assetPath = hash % 2 === 0 ? ASSETS.tree_medium : ASSETS.tree_small;
  } else if (type === 'bush') {
    assetPath = hash % 2 === 0 ? ASSETS.bush_1 : ASSETS.bush_2;
  }

  const { scene } = useGLTF(assetPath);
  const cloned = useMemo(() => scene.clone(), [scene]);

  // Adjust model scale (they might be huge or tiny in world units)
  const baseScale = type === 'bush' ? 0.8 : 2.5;
  const finalScale = baseScale * scale * (0.9 + (hash % 20) * 0.01);

  return (
    <primitive
      object={cloned}
      position={position}
      scale={[finalScale, finalScale, finalScale]}
      rotation={[0, (hash % 360) * (Math.PI / 180), 0]}
    />
  );
}

// Preload common nature assets
for (const path of Object.values(ASSETS)) {
  useGLTF.preload(path);
}
