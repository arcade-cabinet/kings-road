import * as THREE from 'three';
import type { Face } from '../../schemas/npc-blueprint.schema';

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const EYE_COLORS: Record<string, string> = {
  brown: '#5c3317',
  blue: '#4488cc',
  green: '#44aa66',
  gray: '#888899',
};

export function generateFaceTexture(face: Face): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const skinHex = SKIN_COLORS[face.skinTone] ?? SKIN_COLORS[2];
  const eyeHex = EYE_COLORS[face.eyeColor] ?? EYE_COLORS.brown;

  // Base skin
  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, size, size);

  // Hair (top + sides based on style)
  ctx.fillStyle = face.hairColor;
  if (face.hairStyle !== 'bald') {
    ctx.fillRect(0, 0, size, 32);
    if (face.hairStyle === 'long' || face.hairStyle === 'hooded') {
      ctx.fillRect(0, 0, 24, size);
      ctx.fillRect(size - 24, 0, 24, size);
    }
    if (face.hairStyle === 'short') {
      ctx.fillRect(0, 0, 16, 64);
      ctx.fillRect(size - 16, 0, 16, 64);
    }
  }

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(36, 56, 16, 16);
  ctx.fillRect(76, 56, 16, 16);
  ctx.fillStyle = eyeHex;
  ctx.fillRect(40, 60, 10, 10);
  ctx.fillRect(80, 60, 10, 10);
  ctx.fillStyle = '#111111';
  ctx.fillRect(43, 63, 4, 4);
  ctx.fillRect(83, 63, 4, 4);

  // Mouth
  ctx.fillStyle = '#aa4444';
  ctx.fillRect(48, 92, 32, 6);

  // Facial hair
  if (face.facialHair === 'full_beard') {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(32, 88, 64, 32);
    ctx.fillRect(24, 76, 16, 40);
    ctx.fillRect(88, 76, 16, 40);
  } else if (face.facialHair === 'mustache') {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(40, 84, 48, 8);
  } else if (face.facialHair === 'stubble') {
    ctx.fillStyle = face.hairColor + '44';
    for (let i = 0; i < 60; i++) {
      const sx = 32 + ((i * 7) % 64);
      const sy = 80 + ((i * 11) % 40);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  return new THREE.CanvasTexture(canvas);
}
