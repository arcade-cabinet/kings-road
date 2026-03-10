import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { KingdomBiome } from '../../schemas/kingdom.schema';
import type { AudioZone } from '../audio/ambient-mixer';
import { computeAmbientMix } from '../audio/ambient-mixer';
import type { AudioLayer } from '../audio/layer-factory';
import { createAllLayers } from '../audio/layer-factory';
import { useCombatStore } from '../stores/combatStore';
import { useGameStore } from '../stores/gameStore';
import { useWorldStore, worldToGrid } from '../stores/worldStore';
import { CHUNK_SIZE } from '../utils/worldCoords';

// ── One-shot Synths ──────────────────────────────────────────────

const hitSynth = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
}).toDestination();

const damageSynth = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 4,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.4 },
}).toDestination();

/** Biomes that emit water audio */
const WATER_BIOMES: Set<KingdomBiome> = new Set([
  'riverside',
  'coast',
  'swamp',
  'ocean',
]);

/** Biomes that emit vegetation audio */
const VEGETATION_BIOMES: Set<KingdomBiome> = new Set([
  'forest',
  'deep_forest',
  'swamp',
  'meadow',
]);

/** How often to rebuild audio zones from the kingdom map (seconds) */
const ZONE_REBUILD_INTERVAL = 2.0;

/** Radius in grid tiles to sample around the player */
const ZONE_SAMPLE_RADIUS = 3;

/**
 * Derive audio zones from nearby kingdom map tiles.
 * Samples a small grid around the player and creates zones for
 * water-adjacent and vegetation-rich biomes.
 */
function deriveAudioZones(playerX: number, playerZ: number): AudioZone[] {
  const worldStore = useWorldStore.getState();
  const map = worldStore.kingdomMap;
  if (!map) return [];

  const [cx, cy] = worldToGrid(playerX, playerZ);
  const zones: AudioZone[] = [];

  for (let dy = -ZONE_SAMPLE_RADIUS; dy <= ZONE_SAMPLE_RADIUS; dy++) {
    for (let dx = -ZONE_SAMPLE_RADIUS; dx <= ZONE_SAMPLE_RADIUS; dx++) {
      const gx = cx + dx;
      const gy = cy + dy;
      const tile = worldStore.getTileAtGrid(gx, gy);
      if (!tile) continue;

      const worldCenterX = gx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const worldCenterZ = gy * CHUNK_SIZE + CHUNK_SIZE / 2;

      if (WATER_BIOMES.has(tile.biome)) {
        zones.push({
          type: 'water',
          x: worldCenterX,
          z: worldCenterZ,
          radius: CHUNK_SIZE * 1.5,
          volume: tile.biome === 'ocean' ? 0.6 : 0.4,
        });
      }

      if (VEGETATION_BIOMES.has(tile.biome)) {
        zones.push({
          type: 'vegetation',
          x: worldCenterX,
          z: worldCenterZ,
          radius: CHUNK_SIZE * 1.2,
          volume: tile.biome === 'deep_forest' ? 0.5 : 0.3,
        });
      }
    }
  }

  return zones;
}

export function AudioSystem() {
  const [initialized, setInitialized] = useState(false);
  const layersRef = useRef<AudioLayer[]>([]);
  const zonesRef = useRef<AudioZone[]>([]);
  const zoneTimerRef = useRef(0);
  
  const lastHitRef = useRef(0);
  const lastDamageRef = useRef(0);

  // Initialize on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      if (initialized) return;
      try {
        await Tone.start();
        const layers = createAllLayers();
        for (const layer of layers) {
          layer.gain.toDestination();
          layer.start();
        }
        layersRef.current = layers;
        setInitialized(true);
      } catch (err) {
        console.error('[AudioSystem] Failed to initialize Web Audio:', err);
        throw err;
      }
    };

    const handler = () => {
      initAudio();
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };

    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
      for (const layer of layersRef.current) {
        layer.stop();
        layer.gain.dispose();
      }
      layersRef.current = [];
    };
  }, [initialized]);

  // Update volumes each frame
  useFrame((_, delta) => {
    if (!initialized || layersRef.current.length === 0) return;

    const { playerPosition, timeOfDay } = useGameStore.getState();
    const { lastHitTime, lastDamageTime } = useCombatStore.getState();

    // ── Combat SFX ──────────────────────────────────────────────────
    
    if (lastHitTime > lastHitRef.current) {
      lastHitRef.current = lastHitTime;
      hitSynth.triggerAttackRelease('16n');
    }
    
    if (lastDamageTime > lastDamageRef.current) {
      lastDamageRef.current = lastDamageTime;
      damageSynth.triggerAttackRelease('G1', '8n');
    }

    // ── Ambient Mixing ──────────────────────────────────────────────

    // Rebuild audio zones periodically (not every frame)
    zoneTimerRef.current += delta;
    if (zoneTimerRef.current >= ZONE_REBUILD_INTERVAL) {
      zoneTimerRef.current = 0;
      zonesRef.current = deriveAudioZones(playerPosition.x, playerPosition.z);
    }

    const mix = computeAmbientMix(
      timeOfDay,
      zonesRef.current,
      playerPosition.x,
      playerPosition.z,
    );

    for (const layer of layersRef.current) {
      const targetVolume = mix[layer.name] ?? 0;
      // Smooth volume transition
      const current = layer.gain.gain.value;
      layer.gain.gain.value = current + (targetVolume - current) * 0.05;
    }
  });

  return null;
}
