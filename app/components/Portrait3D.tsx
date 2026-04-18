import { useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { assetUrl } from '@/lib/assets';

const MODEL_MAPPING: Record<string, string> = {
  guard: 'knight',
  knight: 'knight',
  captain: 'knight',
  merchant: 'merchant',
  innkeeper: 'merchant',
  healer: 'student',
  scholar: 'student',
  priest: 'student',
  hermit: 'villagers',
  farmer: 'villagers',
  noble: 'merchant',
  pilgrim: 'villagers',
  wanderer: 'villagers',
  villager: 'villagers',
  blacksmith: 'villagers',
  bandit: 'ninja',
  herbalist: 'student',
  lord: 'merchant',
  miller: 'villagers',
  jailer: 'knight',
  stablehand: 'villagers',
  watchman: 'knight',
  ninja: 'ninja',
  archer: 'archer',
};

interface Portrait3DProps {
  type: string;
}

function NPCModel({ type }: { type: string }) {
  const modelName = MODEL_MAPPING[type] || 'basemesh';
  const { scene } = useGLTF(assetUrl(`/assets/npcs/${modelName}.glb`));
  const cloned = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive object={cloned} scale={[1.8, 1.8, 1.8]} position={[0, -1, 0]} />
  );
}

export function Portrait3D({ type }: Portrait3DProps) {
  return (
    <div className="w-24 h-24 md:w-32 md:h-32 relative overflow-hidden rounded border-2 border-[#c4a747]/60 bg-amber-900/10 shadow-inner">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 40 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <group position={[0, -0.1, 0]}>
            <NPCModel type={type} />
          </group>
        </Suspense>
      </Canvas>
      {/* Brass corner ornaments */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#c4a747]" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#c4a747]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#c4a747]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#c4a747]" />
    </div>
  );
}

// Preload common portraits (deduplicated)
const uniqueModels = Array.from(new Set(Object.values(MODEL_MAPPING)));
for (const model of uniqueModels) {
  useGLTF.preload(assetUrl(`/assets/npcs/${model}.glb`));
}
