import { useAnimations, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
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

/**
 * Portraits should appear alive during dialogue: prefer a talking clip
 * (`Talk_1`, `Talk_Old`) over an idle. Falls back to idle/walk for packs
 * that don't ship a talk animation (knight/3DPSX packs).
 */
function pickPortraitClip(clipNames: string[]): string | null {
  const preferences = [
    'Talk_1',
    'Talk_Old',
    'Idle_1',
    'anim_iddle',
    'iddleanim_',
    'Idle_2',
  ];
  for (const pref of preferences) {
    if (clipNames.includes(pref)) return pref;
  }
  return (
    clipNames.find(
      (n) => n.toLowerCase().includes('talk') || n.toLowerCase().includes('idle') || n.toLowerCase().includes('iddle'),
    ) ?? null
  );
}

function NPCModel({ type }: { type: string }) {
  const modelName = MODEL_MAPPING[type] || 'basemesh';
  const gltf = useGLTF(assetUrl(`/assets/npcs/${modelName}.glb`)) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const cloned = useMemo(
    () => SkeletonUtils.clone(gltf.scene) as THREE.Group,
    [gltf.scene],
  );

  const groupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(gltf.animations, groupRef);
  useEffect(() => {
    const clipName = pickPortraitClip(names);
    if (!clipName) return;
    const action = actions[clipName];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={groupRef}>
      <primitive object={cloned} scale={[1.8, 1.8, 1.8]} position={[0, -1, 0]} />
    </group>
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
