import { Environment } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';
import { BiomeService, type HdriSpec, type TimeOfDayBucket } from '@/biome';
import { BiomeError } from '@/core';
import { getPlayer } from '@/ecs/actions/game';
import { useEnvironment } from '@/ecs/hooks/useGameSession';
import { assetUrl } from '@/lib/assets';

/** Coarse time-of-day bucket for HDRI selection. */
export function timeOfDayBucket(timeOfDay: number): TimeOfDayBucket {
  if (timeOfDay < 0.2 || timeOfDay >= 0.85) return 'night';
  if (timeOfDay < 0.35) return 'dawn';
  if (timeOfDay < 0.7) return 'noon';
  return 'dusk';
}

/**
 * Resolve HDRI id — handles both single-string and per-bucket-dict schema forms.
 * Falls back to the noon bucket then to any defined bucket if the requested one
 * is missing.
 */
function resolveHdriId(hdri: HdriSpec, bucket: TimeOfDayBucket): string {
  if (typeof hdri === 'string') return hdri;
  return hdri[bucket] ?? hdri.noon ?? Object.values(hdri)[0];
}

/** Inner component — suspends while HDRI loads. Remounts on key change to swap HDRIs. */
function IBLMap({ hdriId }: { hdriId: string }) {
  // Subdirectory per id: public/assets/hdri/<id>/<id>.hdr
  const url = assetUrl(`/assets/hdri/${hdriId}/${hdriId}.hdr`);
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
  } catch (err) {
    // BiomeService not yet initialized — render nothing until init lands.
    // Surface any other error so genuine bugs aren't silently eaten.
    if (err instanceof BiomeError) return null;
    throw err;
  }

  const hdriId = resolveHdriId(biome.lighting.hdri, bucket);

  // Key forces IBLMap remount (and new Suspense boundary resolution) on HDRI change.
  // crossFadeDuration is a hint — actual fade timing is controlled by the caller's
  // Suspense fallback + CSS transition on the wrapping element if desired.
  const key = `${biome.id}:${hdriId}:${crossFadeDuration}`;

  return <IBLMap key={key} hdriId={hdriId} />;
}
