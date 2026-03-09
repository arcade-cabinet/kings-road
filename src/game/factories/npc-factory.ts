import type * as THREE from 'three';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { generateFaceTexture } from './face-texture';

export interface NPCRenderData {
  torsoHeight: number;
  torsoRadiusTop: number;
  torsoRadiusBottom: number;
  headRadius: number;
  legHeight: number;
  armLength: number;
  faceTexture: THREE.CanvasTexture;
  clothPrimary: string;
  clothSecondary: string;
  skinColor: string;
  accessories: string[];
}

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

export function buildNPCRenderData(blueprint: NPCBlueprint): NPCRenderData {
  const { bodyBuild, face, clothPalette, accessories } = blueprint;

  // Scale body dimensions based on build
  const heightScale = bodyBuild.height;
  const widthScale = bodyBuild.width;

  const torsoHeight = 0.7 * heightScale;
  const torsoRadiusTop = 0.25 * widthScale;
  const torsoRadiusBottom = 0.22 * widthScale;
  const headRadius = 0.28;
  const legHeight = 0.55 * heightScale;
  const armLength = 0.45 * heightScale;

  const faceTexture = generateFaceTexture(face);
  const skinColor = SKIN_COLORS[face.skinTone] ?? SKIN_COLORS[2];

  return {
    torsoHeight,
    torsoRadiusTop,
    torsoRadiusBottom,
    headRadius,
    legHeight,
    armLength,
    faceTexture,
    clothPrimary: clothPalette.primary,
    clothSecondary: clothPalette.secondary ?? clothPalette.primary,
    skinColor,
    accessories: accessories ?? [],
  };
}
