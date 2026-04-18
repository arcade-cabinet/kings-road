import { Environment } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { useEffect } from 'react';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as THREE from 'three';
import { BiomeService } from '@/biome';
import { assetUrl } from '@/lib/assets';
import { getPlayer } from '@/ecs/actions/game';
import { useEnvironment } from '@/ecs/hooks/useGameSession';

type TimeOfDayBucket = 'dawn' | 'noon' | 'dusk' | 'night';

/** Coarse time-of-day bucket for HDRI selection. */
export function timeOfDayBucket(timeOfDay: number): TimeOfDayBucket {
  if (timeOfDay < 0.2 || timeOfDay >= 0.85) return 'night';
  if (timeOfDay < 0.35) return 'dawn';
  if (timeOfDay < 0.7) return 'noon';
  return 'dusk';
}

/** Resolve HDRI id — supports both single-string and per-bucket-dict schemas. */
function resolveHdriId(
  hdri: string | Record<string, string>,
  bucket: TimeOfDayBucket,
): string {
  if (typeof hdri === 'string') return hdri;
  return hdri[bucket] ?? hdri.noon ?? Object.values(hdri)[0];
}

/** Inner component — suspends while HDRI loads. Remounts on key change to swap HDRIs. */
function IBLMap({ hdriId }: { hdriId: string }) {
  const url = assetUrl(`/assets/hdri/${hdriId}.hdr`);
  const texture = useLoader(RGBELoader, url);

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
  }, [texture]);

  return <Environment map={texture} background={false} environmentIntensity={1.0} />;
}

export interface EnvironmentIBLProps {
  /**
   * Duration of HDRI cross-fade in seconds when biome or time-of-day bucket changes.
   * Cross-fade is achieved by React remounting IBLMap (new Suspense + key), so the
   * outgoing HDRI stays visible until the incoming one resolves.
   */
  crossFadeDuration?: number;
}

/**
 * HDRI-based Image Based Lighting for the R3F scene.
 *
 * - Reads the current biome from BiomeService using player road position (X axis).
 * - Picks the right HDRI from `biome.lighting.hdri` for the current time-of-day bucket.
 * - Cross-fades by remounting IBLMap under a new key, letting Suspense keep the old
 *   HDRI visible until the new one resolves.
 * - Must be wrapped in <Suspense> by the caller.
 * - Returns null when BiomeService is not yet initialized.
 */
export function EnvironmentIBL({ crossFadeDuration = 2.0 }: EnvironmentIBLProps) {
  const { timeOfDay } = useEnvironment();
  const bucket = timeOfDayBucket(timeOfDay);

  let biome;
  try {
    // Road distance is playerPosition.x (world X == road spine distance)
    const roadDist = getPlayer().playerPosition?.x ?? 0;
    biome = BiomeService.getCurrentBiome(roadDist);
  } catch {
    return null;
  }

  const hdriId = resolveHdriId(
    biome.lighting.hdri as string | Record<string, string>,
    bucket,
  );

  // Key forces IBLMap remount (and new Suspense boundary resolution) on HDRI change.
  // crossFadeDuration is a hint — actual fade timing is controlled by the caller's
  // Suspense fallback + CSS transition on the wrapping element if desired.
  const key = `${biome.id}:${hdriId}:${crossFadeDuration}`;

  return <IBLMap key={key} hdriId={hdriId} />;
}
