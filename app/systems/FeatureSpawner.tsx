// NOTE: This file is over the 300-LOC soft cap. The breakup is planned
// for the Thornfield Phase 0 `src/composition/` package — `FeatureMesh`
// and `AuthoredFeatureMesh` move to `composition/story-props/`, and
// this file becomes pure orchestration (trigger detection + lifecycle)
// feeding the composed placement list to a single instanced renderer.
// See docs/superpowers/specs/2026-04-18-thornfield-phase-0.md. We do
// NOT carve up the file in this PR because Phase 0 reorganizes the
// whole path — an intermediate reshuffle here would have to be redone.
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  getAllFeatures,
  getPacingConfig,
  isContentStoreReady,
} from '@/db/content-queries';
import { assetUrl } from '@/lib/assets';
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

/** Pick a random value within an interval range */
function randomInRange(rng: () => number, range: [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}

// --- Spawned feature tracking ---

interface SpawnedFeature {
  id: string;
  definition: FeatureDefinition;
  position: [number, number, number];
  rotation: number;
  interactable?: Interactable;
}
// --- Feature mesh component ---

function FeatureMesh({ feature }: { feature: SpawnedFeature }) {
  if (!feature.definition.glb) {
    throw new Error(
      `FeatureSpawner: "${feature.definition.id}" has no glb — every ` +
        `feature definition must declare an authored GLB.`,
    );
  }
  return <AuthoredFeatureMesh feature={feature} />;
}

function AuthoredFeatureMesh({ feature }: { feature: SpawnedFeature }) {
  const { glb, glbScale, glbYawRange, tier } = feature.definition;
  // glb is non-null here per FeatureMesh guard.
  const gltf = useGLTF(assetUrl(`/assets/${glb}`));
  const tierScale = tier === 'major' ? 1.5 : tier === 'minor' ? 1.0 : 0.6;
  const scale = tierScale * glbScale;

  // Deterministic per-instance yaw from the feature's id hash.
  const yawOffset = useMemo(() => {
    const h = feature.id
      .split('')
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ((h % 360) / 360) * glbYawRange * (Math.PI / 180);
  }, [feature.id, glbYawRange]);

  // Clone the scene so multiple instances of the same GLB don't share
  // transform state. Drei's useGLTF hands out a shared scene by default.
  const sceneInstance = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <primitive
      object={sceneInstance}
      position={feature.position}
      rotation={[0, feature.rotation + yawOffset, 0]}
      scale={scale}
    />
  );
}

// --- Main system ---

/** Maximum features to keep alive at once to limit memory */
const MAX_SPAWNED_FEATURES = 30;

/** Grace period before first feature spawns (seconds) */
const INITIAL_GRACE = 3;

export function FeatureSpawner() {
  const { gameActive } = useFlags();
  const { currentChunkType } = useChunkState();
  const { seedPhrase } = useSeed();

  // When kingdom map has pre-placed features, skip timer-based spawning.
  // Features are placed deterministically by the chunk system instead.
  const hasKingdomFeatures = useWorldSession().featurePlacements.length > 0;

  const spawnedRef = useRef<SpawnedFeature[]>([]);
  const ambientTimerRef = useRef(INITIAL_GRACE);
  const minorTimerRef = useRef(INITIAL_GRACE);
  const majorTimerRef = useRef(INITIAL_GRACE);
  const ambientTargetRef = useRef(0);
  const minorTargetRef = useRef(0);
  const majorTargetRef = useRef(0);
  const spawnCounterRef = useRef(0);

  // Initialize random interval targets on first frame
  const initializedRef = useRef(false);

  useFrame((_, delta) => {
    if (!gameActive || !seedPhrase) return;

    // Skip timer-based spawning when kingdom map features are active
    if (hasKingdomFeatures) return;

    // Content store must be ready before we can spawn features
    if (!ensureFeatureData()) return;

    // Only spawn in ROAD and WILD chunks
    if (currentChunkType !== 'ROAD' && currentChunkType !== 'WILD') return;

    const dt = Math.min(delta, 0.1);

    // Initialize interval targets with seeded RNG
    if (!initializedRef.current) {
      const rng = mulberry32(cyrb128(`${seedPhrase}feature-spawner`));
      ambientTargetRef.current = randomInRange(rng, AMBIENT_INTERVAL);
      minorTargetRef.current = randomInRange(rng, MINOR_INTERVAL);
      majorTargetRef.current = randomInRange(rng, MAJOR_INTERVAL);
      initializedRef.current = true;
    }

    // Tick all timers
    ambientTimerRef.current += dt;
    minorTimerRef.current += dt;
    majorTimerRef.current += dt;

    // Check each tier
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

    // Spawn one feature per triggered tier
    for (const tier of tiersToSpawn) {
      const pool = FEATURES_BY_TIER[tier];
      if (!pool || pool.length === 0) continue;

      // Seeded RNG based on player position + spawn count for determinism
      const spawnSeed = `${seedPhrase}-feature-${spawnCounterRef.current}`;
      const rng = mulberry32(cyrb128(spawnSeed));
      spawnCounterRef.current += 1;

      // Pick a random feature from the tier pool
      const definition = pool[Math.floor(rng() * pool.length)];

      // Place feature to the side of the player's path, ahead of them
      const offsetX = (rng() > 0.5 ? 1 : -1) * (8 + rng() * 20);
      const offsetZ = 15 + rng() * 30; // Ahead of the player
      const px = playerPosition.x + offsetX;
      const pz = playerPosition.z + offsetZ;

      const featureId = `feature-${spawnCounterRef.current}`;
      const rotation = rng() * Math.PI * 2;

      const spawned: SpawnedFeature = {
        id: featureId,
        definition,
        position: [px, 0, pz],
        rotation,
      };

      // Create interactable entry if the feature is interactable
      if (definition.interactable) {
        const interactable: Interactable = {
          id: featureId,
          position: new THREE.Vector3(px, 0, pz),
          radius: tier === 'major' ? 6 : 4,
          type: 'wanderer', // Use wanderer type for interaction compatibility
          name: definition.name,
          dialogueText: definition.dialogueOnInteract ?? definition.description,
          actionVerb: 'EXAMINE',
        };
        spawned.interactable = interactable;
        addGlobalInteractables([interactable]);
      }

      spawnedRef.current.push(spawned);

      // Reset interval target with fresh randomness
      const intervalRange =
        tier === 'ambient'
          ? AMBIENT_INTERVAL
          : tier === 'minor'
            ? MINOR_INTERVAL
            : MAJOR_INTERVAL;
      const nextRng = mulberry32(cyrb128(`${spawnSeed}-next`));
      if (tier === 'ambient') {
        ambientTargetRef.current = randomInRange(nextRng, intervalRange);
      } else if (tier === 'minor') {
        minorTargetRef.current = randomInRange(nextRng, intervalRange);
      } else {
        majorTargetRef.current = randomInRange(nextRng, intervalRange);
      }
    }

    // Evict oldest features if over the limit
    while (spawnedRef.current.length > MAX_SPAWNED_FEATURES) {
      const evicted = spawnedRef.current.shift();
      if (evicted?.interactable) {
        removeGlobalInteractables([evicted.interactable]);
      }
    }
  });

  // Don't render if not active or kingdom map features are handling it
  if (!gameActive || hasKingdomFeatures) return null;

  return (
    <>
      {spawnedRef.current.map((feature) => (
        <FeatureMesh key={feature.id} feature={feature} />
      ))}
    </>
  );
}
