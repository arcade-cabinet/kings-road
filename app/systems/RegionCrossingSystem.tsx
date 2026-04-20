import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { getFlags, getPlayer, setRegionCrossing } from '@/ecs/actions/game';
import { getRegionAtDistance } from '@/world/road-spine';

/**
 * How often to sample the player's road position (seconds). 0.25 s is
 * imperceptibly slow for a banner that stays visible for 2 s — avoids a
 * map lookup on every frame.
 */
const SAMPLE_INTERVAL_S = 0.25;

/**
 * RegionCrossingSystem — renderless R3F component that detects when the
 * player crosses a road-spine biome boundary and writes the crossing state
 * to the RegionCrossing session trait. RegionBanner reads that trait
 * reactively and handles the display / dismiss lifecycle.
 *
 * Road distance axis: playerPosition.x (consistent with BiomeService and
 * WeatherSystem throughout this codebase).
 *
 * Must be mounted inside the R3F Canvas so that useFrame is available.
 * Placed alongside the other always-active systems in GameScene.
 */
export function RegionCrossingSystem() {
  const lastRegionId = useRef<string>('');
  const sampleAccRef = useRef(0);

  useFrame((_, delta) => {
    const flags = getFlags();
    if (!flags.gameActive || flags.inDungeon) return;

    sampleAccRef.current += delta;
    if (sampleAccRef.current < SAMPLE_INTERVAL_S) return;
    sampleAccRef.current = 0;

    const roadDist = getPlayer().playerPosition?.x ?? 0;
    const region = getRegionAtDistance(roadDist);
    if (!region) return;

    if (region.id === lastRegionId.current) return;

    lastRegionId.current = region.id;
    setRegionCrossing({
      regionId: region.id,
      regionName: region.name,
      crossingDistance: roadDist,
    });
  });

  return null;
}
