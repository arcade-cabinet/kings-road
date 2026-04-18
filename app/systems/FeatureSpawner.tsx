import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import {
  getAllFeatures,
  getPacingConfig,
  isContentStoreReady,
} from '@/db/content-queries';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import {
  addGlobalInteractables,
  getPlayer,
  removeGlobalInteractables,
} from '@/ecs/actions/game';
import {
  useChunkState,
  useFlags,
  useSeed,
} from '@/ecs/hooks/useGameSession';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { Interactable } from '@/types/game';
import { cyrb128, mulberry32 } from '@/core';
import { SpawnedFeatureMesh } from '@app/scene/SpawnedFeatureMesh';

// --- Lazy-initialized registries (populated on first access from content store) ---

let featuresInitialized = false;
let ALL_FEATURES: FeatureDefinition[] = [];
let FEATURES_BY_TIER: Record<string, FeatureDefinition[]> = {};
let AMBIENT_INTERVAL: [number, number] = [8, 15];
let MINOR_INTERVAL: [number, number] = [20, 40];
let MAJOR_INTERVAL: [number, number] = [60, 120];

function ensureFeatureData(): boolean {
  if (featuresInitialized) return true;
  if (!isContentStoreReady()) return false;

  ALL_FEATURES = getAllFeatures();
  FEATURES_BY_TIER = {
    ambient: ALL_FEATURES.filter((f) => f.tier === 'ambient'),
    minor: ALL_FEATURES.filter((f) => f.tier === 'minor'),
    major: ALL_FEATURES.filter((f) => f.tier === 'major'),
  };

  const pacing = getPacingConfig() as {
    ambientInterval?: [number, number];
    minorInterval?: [number, number];
    majorInterval?: [number, number];
  } | null;
  if (pacing) {
    if (pacing.ambientInterval) AMBIENT_INTERVAL = pacing.ambientInterval;
    if (pacing.minorInterval) MINOR_INTERVAL = pacing.minorInterval;
    if (pacing.majorInterval) MAJOR_INTERVAL = pacing.majorInterval;
  }

  featuresInitialized = true;
  return true;
}

function randomInRange(rng: () => number, range: [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}

interface SpawnedFeature {
  id: string;
  definition: FeatureDefinition;
  position: [number, number, number];
  rotation: number;
  interactable?: Interactable;
}

const MAX_SPAWNED_FEATURES = 30;
const INITIAL_GRACE = 3;

export function FeatureSpawner() {
  const { gameActive } = useFlags();
  const { currentChunkType } = useChunkState();
  const { seedPhrase } = useSeed();
  const hasKingdomFeatures = useWorldSession().featurePlacements.length > 0;

  const spawnedRef = useRef<SpawnedFeature[]>([]);
  const ambientTimerRef = useRef(INITIAL_GRACE);
  const minorTimerRef = useRef(INITIAL_GRACE);
  const majorTimerRef = useRef(INITIAL_GRACE);
  const ambientTargetRef = useRef(0);
  const minorTargetRef = useRef(0);
  const majorTargetRef = useRef(0);
  const spawnCounterRef = useRef(0);
  const initializedRef = useRef(false);

  useFrame((_, delta) => {
    if (!gameActive || !seedPhrase) return;
    if (hasKingdomFeatures) return;
    if (!ensureFeatureData()) return;
    if (currentChunkType !== 'ROAD' && currentChunkType !== 'WILD') return;

    const dt = Math.min(delta, 0.1);

    if (!initializedRef.current) {
      const rng = mulberry32(cyrb128(`${seedPhrase}feature-spawner`));
      ambientTargetRef.current = randomInRange(rng, AMBIENT_INTERVAL);
      minorTargetRef.current = randomInRange(rng, MINOR_INTERVAL);
      majorTargetRef.current = randomInRange(rng, MAJOR_INTERVAL);
      initializedRef.current = true;
    }

    ambientTimerRef.current += dt;
    minorTimerRef.current += dt;
    majorTimerRef.current += dt;

    const tiersToSpawn: string[] = [];
    if (ambientTimerRef.current >= ambientTargetRef.current) {
      tiersToSpawn.push('ambient');
      ambientTimerRef.current = 0;
    }
    if (minorTimerRef.current >= minorTargetRef.current) {
      tiersToSpawn.push('minor');
      minorTimerRef.current = 0;
    }
    if (majorTimerRef.current >= majorTargetRef.current) {
      tiersToSpawn.push('major');
      majorTimerRef.current = 0;
    }

    if (tiersToSpawn.length === 0) return;

    const { playerPosition } = getPlayer();

    for (const tier of tiersToSpawn) {
      const pool = FEATURES_BY_TIER[tier];
      if (!pool || pool.length === 0) continue;

      const spawnSeed = `${seedPhrase}-feature-${spawnCounterRef.current}`;
      const rng = mulberry32(cyrb128(spawnSeed));
      spawnCounterRef.current += 1;

      const definition = pool[Math.floor(rng() * pool.length)];
      const offsetX = (rng() > 0.5 ? 1 : -1) * (8 + rng() * 20);
      const offsetZ = 15 + rng() * 30;
      const px = playerPosition.x + offsetX;
      const pz = playerPosition.z + offsetZ;

      const featureId = `feature-${spawnCounterRef.current}`;
      const rotation = rng() * Math.PI * 2;

      const spawned: SpawnedFeature = { id: featureId, definition, position: [px, 0, pz], rotation };

      if (definition.interactable) {
        const interactable: Interactable = {
          id: featureId,
          position: new THREE.Vector3(px, 0, pz),
          radius: tier === 'major' ? 6 : 4,
          type: 'wanderer',
          name: definition.name,
          dialogueText: definition.dialogueOnInteract ?? definition.description,
          actionVerb: 'EXAMINE',
        };
        spawned.interactable = interactable;
        addGlobalInteractables([interactable]);
      }

      spawnedRef.current.push(spawned);

      const intervalRange =
        tier === 'ambient' ? AMBIENT_INTERVAL : tier === 'minor' ? MINOR_INTERVAL : MAJOR_INTERVAL;
      const nextRng = mulberry32(cyrb128(`${spawnSeed}-next`));
      if (tier === 'ambient') ambientTargetRef.current = randomInRange(nextRng, intervalRange);
      else if (tier === 'minor') minorTargetRef.current = randomInRange(nextRng, intervalRange);
      else majorTargetRef.current = randomInRange(nextRng, intervalRange);
    }

    while (spawnedRef.current.length > MAX_SPAWNED_FEATURES) {
      const evicted = spawnedRef.current.shift();
      if (evicted?.interactable) removeGlobalInteractables([evicted.interactable]);
    }
  });

  if (!gameActive || hasKingdomFeatures) return null;

  return (
    <>
      {spawnedRef.current.map((feature) => (
        <SpawnedFeatureMesh
          key={feature.id}
          id={feature.id}
          definition={feature.definition}
          position={feature.position}
          rotation={feature.rotation}
        />
      ))}
    </>
  );
}
