/**
 * Feature — renders a placed feature (shrine, ruin, standing stone, etc.)
 * using simple procedural geometry. Reuses the visual mapping from
 * FeatureSpawner but as a standalone component for chunk-based rendering.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { PlacedFeatureData } from '../types';

// --- Visual type to geometry/color mapping ---

interface FeatureVisual {
  geometry: 'stone' | 'wood' | 'foliage' | 'column' | 'mound';
  color: string;
  scale: [number, number, number];
  emissive?: string;
}

function getFeatureVisual(visualType: string, tier: string): FeatureVisual {
  const tierScale = tier === 'major' ? 1.5 : tier === 'minor' ? 1.0 : 0.6;

  switch (visualType) {
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
    case 'ruined_archway_dungeon_entrance':
      return {
        geometry: 'stone',
        color: '#6a6a5e',
        scale: [4 * tierScale, 3, 2 * tierScale],
      };
    case 'dragon_skeleton_monument':
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
    case 'cave_dwelling_with_smoke':
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
    case 'ancient_ruins':
      return {
        geometry: 'stone',
        color: '#8a8578',
        scale: [3 * tierScale, 1.5, 3 * tierScale],
      };
    default:
      return {
        geometry: 'stone',
        color: '#9a9a8e',
        scale: [1 * tierScale, 1, 1 * tierScale],
      };
  }
}

// --- Geometry cache ---

const featureGeometryCache = new Map<string, THREE.BufferGeometry>();

function getFeatureGeometry(type: string): THREE.BufferGeometry {
  if (featureGeometryCache.has(type)) return featureGeometryCache.get(type)!;

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

  featureGeometryCache.set(type, geo);
  return geo;
}

// --- Feature component ---

export function Feature({ feature }: { feature: PlacedFeatureData }) {
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
      position={feature.worldPosition}
      rotation={[0, feature.rotation, 0]}
      scale={visual.scale}
      castShadow
      receiveShadow
    />
  );
}
