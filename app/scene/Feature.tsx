/**
 * Feature — renders a placed feature (shrine, ruin, standing stone, etc.)
 * Uses Hybrid Procedural CC0 approach where possible, falling back to
 * primitive geometry for missing assets.
 */

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { hashString } from '@/factories/chibi-generator';
import type { PlacedFeatureData } from '@/types/game';
import { DungeonProp } from './DungeonProp';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');
const ROCKS_PATH = `${BASE_URL}/assets/nature/rocks-transformed.glb`;

// --- Primitive Fallback ---

interface FeatureVisual {
  geometry: 'stone' | 'wood' | 'foliage' | 'column' | 'mound';
  color: string;
  scale: [number, number, number];
  emissive?: string;
}

function getPrimitiveFallback(visualType: string, tier: string): FeatureVisual {
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
    case 'wind_chimes':
      return {
        geometry: 'wood',
        color: '#c4a747',
        scale: [0.3 * tierScale, 1.5, 0.3 * tierScale],
      };
    case 'crossroads_sign':
      return {
        geometry: 'wood',
        color: '#7a6b52',
        scale: [0.3 * tierScale, 2.5, 0.3 * tierScale],
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
    case 'weather_vane':
      return {
        geometry: 'wood',
        color: '#8b7355',
        scale: [0.3 * tierScale, 2.5, 0.3 * tierScale],
      };
    case 'glowing_tree_circle_healing':
      return {
        geometry: 'foliage',
        color: '#b8e8b0',
        scale: [4 * tierScale, 3, 4 * tierScale],
        emissive: '#88ff88',
      };
    default:
      return {
        geometry: 'stone',
        color: '#9a9a8e',
        scale: [1 * tierScale, 1, 1 * tierScale],
      };
  }
}

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

// --- Component ---

export function Feature({ feature }: { feature: PlacedFeatureData }) {
  const { nodes, materials } = useGLTF(ROCKS_PATH) as any;
  const seed = useMemo(() => hashString(feature.id), [feature.id]);

  const type = feature.definition.visualType;
  const tier = feature.definition.tier;
  const tierScale = tier === 'major' ? 1.5 : tier === 'minor' ? 1.0 : 0.6;

  // --- Hybrid Routing ---

  // 1. Mine/Dungeon Props (Crystals, Ropes, Crates)
  if (
    [
      'hermit_cave',
      'cave_dwelling_with_smoke',
      'ancient_ruins',
      'dragon_skeleton_monument',
      'dragon_bones',
      'ruined_archway_dungeon_entrance',
      'ruined_farmstead',
    ].includes(type)
  ) {
    return (
      <DungeonProp
        id={feature.id}
        type="random"
        position={feature.worldPosition}
        rotation={feature.rotation}
      />
    );
  }

  // 2. Rocks / Stones (Milestones, Shrines, Standing Stones, Wells)
  if (
    [
      'standing_stone',
      'wayside_shrine',
      'milestone_marker',
      'old_well',
      'stream_crossing',
      'stone_bridge',
      'watchtower_ruin',
    ].includes(type)
  ) {
    if (nodes?.mediun_rock_3 && nodes?.mediun_rock_2) {
      const rockVariant =
        seed % 2 === 0 ? nodes.mediun_rock_2 : nodes.mediun_rock_3;
      const rockMaterial =
        seed % 2 === 0 ? materials.stone1 : materials['stone 2'];

      return (
        <group
          position={feature.worldPosition}
          rotation={[0, feature.rotation, 0]}
        >
          <mesh
            geometry={rockVariant.geometry}
            material={rockMaterial}
            scale={[tierScale * 1.5, tierScale * 2.5, tierScale * 1.5]}
            castShadow
            receiveShadow
          />
        </group>
      );
    }
  }

  // 3. Fallback Primitives (Bushes, Trees, Carts - until we import those specific CC0 packs)
  const visual = getPrimitiveFallback(type, tier);
  const geometry = getFeatureGeometry(visual.geometry);
  const material = new THREE.MeshStandardMaterial({
    color: visual.color,
    roughness: 0.85,
    metalness: 0.05,
    emissive: visual.emissive ? new THREE.Color(visual.emissive) : undefined,
    emissiveIntensity: visual.emissive ? 0.3 : 0,
  });

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

useGLTF.preload(ROCKS_PATH);
