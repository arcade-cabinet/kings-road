export interface AudioZone {
  type: 'water' | 'vegetation';
  x: number;
  z: number;
  radius: number;
  volume: number;
}

export interface AmbientMix {
  wind: number;
  birds: number;
  insects: number;
  crickets: number;
  water: number;
  vegetation: number;
}

/**
 * Time-of-day ranges (0-1 where 0=midnight, 0.5=noon):
 * - Birds: 0.25 (6am) to 0.75 (6pm)
 * - Insects: 0.375 (9am) to 0.625 (3pm)
 * - Crickets: 0.75 (6pm) to 0.25 (6am) -- wraps around midnight
 * - Wind: always
 */
export function computeAmbientMix(
  timeOfDay: number,
  zones: AudioZone[],
  playerX: number,
  playerZ: number,
): AmbientMix {
  // Wind always present, slight variation
  const wind = 0.3 + Math.sin(timeOfDay * Math.PI * 2) * 0.1;

  // Birds: dawn through afternoon
  let birds = 0;
  if (timeOfDay >= 0.25 && timeOfDay <= 0.75) {
    // Peak at noon, fade at edges
    const birdPhase = (timeOfDay - 0.25) / 0.5; // 0 to 1
    birds = Math.sin(birdPhase * Math.PI) * 0.4;
  }

  // Insects: noon through afternoon
  let insects = 0;
  if (timeOfDay >= 0.375 && timeOfDay <= 0.625) {
    const insectPhase = (timeOfDay - 0.375) / 0.25;
    insects = Math.sin(insectPhase * Math.PI) * 0.25;
  }

  // Crickets: evening through midnight (wraps)
  let crickets = 0;
  if (timeOfDay >= 0.75 || timeOfDay <= 0.25) {
    const cricketTime = timeOfDay >= 0.75 ? timeOfDay - 0.75 : timeOfDay + 0.25;
    const cricketPhase = cricketTime / 0.5;
    crickets = Math.sin(cricketPhase * Math.PI) * 0.35;
  }

  // Spatial zones
  let water = 0;
  let vegetation = 0;

  for (const zone of zones) {
    const dx = playerX - zone.x;
    const dz = playerZ - zone.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const gain = zone.volume * Math.max(0, 1 - dist / zone.radius);

    if (zone.type === 'water') {
      water = Math.max(water, gain);
    } else if (zone.type === 'vegetation') {
      vegetation = Math.max(vegetation, gain);
    }
  }

  return { wind, birds, insects, crickets, water, vegetation };
}
