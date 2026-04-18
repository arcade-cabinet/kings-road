import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  getAllFeatures,
  getPacingConfig,
  isContentStoreReady,
} from '@/db/content-queries';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import {
  addGlobalInteractables,
  getFlags,
  getPlayer,
  getSeedPhrase,
  removeGlobalInteractables,
} from '@/ecs/actions/game';
import {
  useChunkState,
  useFlags,
  useSeed,
} from '@/ecs/hooks/useGameSession';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { Interactable } from '@/types/game';
import { cyrb128, mulberry32 } from '@/utils/random';

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

// --- Visual type to geometry/color mapping ---

interface FeatureVisual {
  geometry: 'stone' | 'wood' | 'foliage' | 'column' | 'mound';
  color: string;
  scale: [number, number, number];
  emissive?: string;
}

function getFeatureVisual(visualType: string, tier: string): FeatureVisual {
  // Major features are bigger
  const tierScale = tier === 'major' ? 1.5 : tier === 'minor' ? 1.0 : 0.6;

  switch (visualType) {
    // Ambient - small natural features
    case 'wildflower_patch':
      return {
        geometry: 'foliage',
        color: '#d4a0d0',
        scale: [1.5 * tierScale, 0.3, 1.5 * tierScale],
      };
    case 'ancient_oak':
      return {
        geometry: 'foliage',
        color: '#4a7c3f',
        scale: [2 * tierScale, 3, 2 * tierScale],
      };
    case 'berry_bush':
      return {
        geometry: 'foliage',
        color: '#6b8e4e',
        scale: [1 * tierScale, 0.8, 1 * tierScale],
      };
    case 'bird_nest':
      return {
        geometry: 'wood',
        color: '#8b6f47',
        scale: [0.5 * tierScale, 0.3, 0.5 * tierScale],
      };
    case 'fallen_log':
      return {
        geometry: 'wood',
        color: '#6b5234',
        scale: [2 * tierScale, 0.5, 0.5 * tierScale],
      };
    case 'fox_den':
      return {
        geometry: 'mound',
        color: '#8b7355',
        scale: [1 * tierScale, 0.6, 1 * tierScale],
      };
    case 'mushroom_ring':
      return {
        geometry: 'foliage',
        color: '#c8a882',
        scale: [1.2 * tierScale, 0.4, 1.2 * tierScale],
      };
    case 'standing_stone':
      return {
        geometry: 'column',
        color: '#9a9a8e',
        scale: [0.5 * tierScale, 2, 0.5 * tierScale],
      };
    case 'stream_crossing':
      return {
        geometry: 'stone',
        color: '#7a8b9a',
        scale: [2 * tierScale, 0.2, 1.5 * tierScale],
      };
    case 'wind_chimes':
      return {
        geometry: 'wood',
        color: '#c4a747',
        scale: [0.3 * tierScale, 1.5, 0.3 * tierScale],
      };

    // Minor - roadside points of interest
    case 'wayside_shrine':
      return {
        geometry: 'stone',
        color: '#d4cfc2',
        scale: [0.8 * tierScale, 1.5, 0.8 * tierScale],
      };
    case 'stone_bridge':
      return {
        geometry: 'stone',
        color: '#8a8578',
        scale: [3 * tierScale, 1.2, 2 * tierScale],
      };
    case 'crossroads_sign':
      return {
        geometry: 'wood',
        color: '#7a6b52',
        scale: [0.3 * tierScale, 2.5, 0.3 * tierScale],
      };
    case 'milestone_marker':
      return {
        geometry: 'stone',
        color: '#b0a89a',
        scale: [0.4 * tierScale, 1.0, 0.4 * tierScale],
      };
    case 'old_well':
      return {
        geometry: 'stone',
        color: '#8a8578',
        scale: [1 * tierScale, 1.2, 1 * tierScale],
      };
    case 'abandoned_camp':
      return {
        geometry: 'wood',
        color: '#6b5234',
        scale: [2 * tierScale, 0.8, 2 * tierScale],
      };
    case 'fairy_circle':
      return {
        geometry: 'foliage',
        color: '#a8d8a0',
        scale: [2 * tierScale, 0.3, 2 * tierScale],
        emissive: '#88cc88',
      };
    case 'hunter_blind':
      return {
        geometry: 'wood',
        color: '#5a4a32',
        scale: [1.5 * tierScale, 2, 1.5 * tierScale],
      };
    case 'ruined_farmstead':
      return {
        geometry: 'stone',
        color: '#9a8a7a',
        scale: [3 * tierScale, 1, 3 * tierScale],
      };
    case 'weather_vane':
      return {
        geometry: 'wood',
        color: '#8b7355',
        scale: [0.3 * tierScale, 2.5, 0.3 * tierScale],
      };

    // Major - significant landmarks
    case 'ruined_archway_dungeon_entrance':
      return {
        geometry: 'stone',
        color: '#6a6a5e',
        scale: [4 * tierScale, 3, 2 * tierScale],
      };
    case 'dragon_bones':
      return {
        geometry: 'stone',
        color: '#e8e0d0',
        scale: [5 * tierScale, 2, 3 * tierScale],
      };
    case 'glowing_tree_circle_healing':
      return {
        geometry: 'foliage',
        color: '#b8e8b0',
        scale: [4 * tierScale, 3, 4 * tierScale],
        emissive: '#88ff88',
      };
    case 'hermit_cave':
      return {
        geometry: 'mound',
        color: '#7a7a6e',
        scale: [3 * tierScale, 2.5, 3 * tierScale],
      };
    case 'watchtower_ruin':
      return {
        geometry: 'column',
        color: '#8a8578',
        scale: [2 * tierScale, 4, 2 * tierScale],
      };

    default:
      return {
        geometry: 'stone',
        color: '#9a9a8e',
        scale: [1 * tierScale, 1, 1 * tierScale],
      };
  }
}

// --- Geometry builders ---

const geometryCache = new Map<string, THREE.BufferGeometry>();

function getFeatureGeometry(type: string): THREE.BufferGeometry {
  if (geometryCache.has(type)) return geometryCache.get(type)!;

  let geo: THREE.BufferGeometry;
  switch (type) {
    case 'stone':
      geo = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'wood':
      geo = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'foliage':
      geo = new THREE.SphereGeometry(0.5, 8, 6);
      break;
    case 'column':
      geo = new THREE.CylinderGeometry(0.4, 0.5, 1, 6);
      break;
    case 'mound':
      geo = new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      break;
    default:
      geo = new THREE.BoxGeometry(1, 1, 1);
  }

  geometryCache.set(type, geo);
  return geo;
}

// --- Feature mesh component ---

function FeatureMesh({ feature }: { feature: SpawnedFeature }) {
  const visual = useMemo(
    () =>
      getFeatureVisual(feature.definition.visualType, feature.definition.tier),
    [feature.definition.visualType, feature.definition.tier],
  );
  const geometry = useMemo(
    () => getFeatureGeometry(visual.geometry),
    [visual.geometry],
  );
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: visual.color,
        roughness: 0.85,
        metalness: 0.05,
        emissive: visual.emissive
          ? new THREE.Color(visual.emissive)
          : undefined,
        emissiveIntensity: visual.emissive ? 0.3 : 0,
      }),
    [visual.color, visual.emissive],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={feature.position}
      rotation={[0, feature.rotation, 0]}
      scale={visual.scale}
      castShadow
      receiveShadow
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
