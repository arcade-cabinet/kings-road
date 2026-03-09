import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { computeAmbientMix } from '../audio/ambient-mixer';
import type { AudioZone } from '../audio/ambient-mixer';
import { createAllLayers } from '../audio/layer-factory';
import type { AudioLayer } from '../audio/layer-factory';
import { useGameStore } from '../stores/gameStore';

export function AudioSystem() {
  const [initialized, setInitialized] = useState(false);
  const layersRef = useRef<AudioLayer[]>([]);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const playerPosition = useGameStore((state) => state.playerPosition);

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
      } catch {
        // Web Audio not available or user hasn't interacted yet
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
      }
    };
  }, [initialized]);

  // Update volumes each frame
  useFrame(() => {
    if (!initialized || layersRef.current.length === 0) return;

    // TODO: zones will come from chunk data in integration phase
    const zones: AudioZone[] = [];

    const mix = computeAmbientMix(
      timeOfDay,
      zones,
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
