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
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      'Failed to get 2D canvas context for face texture generation',
    );
  }

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
    ctx.fillStyle = `${face.hairColor}44`;
    for (let i = 0; i < 60; i++) {
      const sx = 32 + ((i * 7) % 64);
      const sy = 80 + ((i * 11) % 40);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// Chibi face texture generator
// ---------------------------------------------------------------------------

export interface ChibiFaceInput {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  hairStyle:
    | 'bald'
    | 'short'
    | 'long'
    | 'ponytail'
    | 'topknot'
    | 'braided'
    | 'wild'
    | 'hooded';
  facialHair: 'none' | 'stubble' | 'full_beard' | 'mustache';
  expression:
    | 'neutral'
    | 'happy'
    | 'angry'
    | 'sad'
    | 'surprised'
    | 'sleeping'
    | 'speaking';
  race?: 'human' | 'elf' | 'dwarf' | 'orc' | 'halfling';
}

/** Darken a hex colour by a given fraction (0-1). */
function darkenHex(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  const r = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(0, 2), 16) * (1 - amount)),
  );
  const g = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(2, 4), 16) * (1 - amount)),
  );
  const b = Math.max(
    0,
    Math.round(Number.parseInt(raw.slice(4, 6), 16) * (1 - amount)),
  );
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Simple deterministic hash from a string, used for stubble placement. */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// -- Drawing helpers --------------------------------------------------------

function drawSkinBase(ctx: CanvasRenderingContext2D, skinTone: string): void {
  const cx = 256;
  const cy = 230;
  const radius = 220;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, skinTone);
  grad.addColorStop(1, darkenHex(skinTone, 0.15));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  expression: ChibiFaceInput['expression'],
  hairColor: string,
): void {
  const thickness = expression === 'angry' ? 11 : 7;
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';

  // Left brow anchor: (175, 195)  Right brow anchor: (337, 195)
  const leftX = 175;
  const rightX = 337;
  let leftStartY = 195;
  let leftEndY = 195;
  let rightStartY = 195;
  let rightEndY = 195;
  let leftCpY = 190;
  let rightCpY = 190;

  switch (expression) {
    case 'angry':
      // Lowered, angled inward (inner ends down)
      leftStartY = 188;
      leftEndY = 200;
      leftCpY = 192;
      rightStartY = 200;
      rightEndY = 188;
      rightCpY = 192;
      break;
    case 'surprised':
      // Raised high
      leftStartY = 172;
      leftEndY = 172;
      leftCpY = 164;
      rightStartY = 172;
      rightEndY = 172;
      rightCpY = 164;
      break;
    case 'happy':
      // Slightly raised
      leftStartY = 185;
      leftEndY = 185;
      leftCpY = 179;
      rightStartY = 185;
      rightEndY = 185;
      rightCpY = 179;
      break;
    case 'sad':
      // Inner ends raised (inverted V)
      leftStartY = 200;
      leftEndY = 186;
      leftCpY = 190;
      rightStartY = 186;
      rightEndY = 200;
      rightCpY = 190;
      break;
    default:
      // neutral / sleeping / speaking: flat
      break;
  }

  // Left brow
  ctx.beginPath();
  ctx.moveTo(leftX - 30, leftStartY);
  ctx.quadraticCurveTo(leftX, leftCpY, leftX + 30, leftEndY);
  ctx.stroke();

  // Right brow
  ctx.beginPath();
  ctx.moveTo(rightX - 30, rightStartY);
  ctx.quadraticCurveTo(rightX, rightCpY, rightX + 30, rightEndY);
  ctx.stroke();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  expression: ChibiFaceInput['expression'],
  eyeColor: string,
): void {
  const leftCx = 190;
  const rightCx = 322;
  const eyeY = 240;

  if (expression === 'sleeping') {
    // Closed eyes as curved lines
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const cx of [leftCx, rightCx]) {
      ctx.beginPath();
      ctx.arc(cx, eyeY, 22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    return;
  }

  const scleraH = expression === 'surprised' ? 39 : 24;

  for (const cx of [leftCx, rightCx]) {
    // Sclera (white ellipse)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, eyeY, 31, scleraH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Iris
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(cx, eyeY + 2, 16, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(cx, eyeY + 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Shine highlight (upper-left)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 7, eyeY - 5, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  expression: ChibiFaceInput['expression'],
): void {
  const mouthX = 256;
  const mouthY = 310;

  ctx.fillStyle = '#aa4444';
  ctx.strokeStyle = '#aa4444';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  switch (expression) {
    case 'happy': {
      // Upward arc (smile)
      ctx.beginPath();
      ctx.arc(mouthX, mouthY - 8, 28, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'angry': {
      // Slight downward line, thicker
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(mouthX - 22, mouthY);
      ctx.quadraticCurveTo(mouthX, mouthY + 6, mouthX + 22, mouthY);
      ctx.stroke();
      break;
    }
    case 'sad': {
      // Downward arc (frown)
      ctx.beginPath();
      ctx.arc(mouthX, mouthY + 12, 24, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'surprised': {
      // Small open circle
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, 14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'speaking': {
      // Wider open ellipse
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sleeping': {
      // Small "z" shapes
      ctx.fillStyle = '#555555';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('z', mouthX + 40, mouthY - 20);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('z', mouthX + 60, mouthY - 45);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('z', mouthX + 72, mouthY - 62);
      // Tiny closed mouth
      ctx.strokeStyle = '#aa4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mouthX - 10, mouthY);
      ctx.lineTo(mouthX + 10, mouthY);
      ctx.stroke();
      break;
    }
    default: {
      // neutral: horizontal line
      ctx.beginPath();
      ctx.moveTo(mouthX - 18, mouthY);
      ctx.lineTo(mouthX + 18, mouthY);
      ctx.stroke();
      break;
    }
  }
}

function drawFacialHair(
  ctx: CanvasRenderingContext2D,
  facialHair: ChibiFaceInput['facialHair'],
  hairColor: string,
): void {
  if (facialHair === 'none') return;

  const cx = 256;

  if (facialHair === 'full_beard') {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 80, 290);
    ctx.quadraticCurveTo(cx - 95, 340, cx - 60, 390);
    ctx.quadraticCurveTo(cx, 430, cx + 60, 390);
    ctx.quadraticCurveTo(cx + 95, 340, cx + 80, 290);
    ctx.quadraticCurveTo(cx, 300, cx - 80, 290);
    ctx.fill();
  } else if (facialHair === 'mustache') {
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    // Left side
    ctx.beginPath();
    ctx.moveTo(cx, 298);
    ctx.quadraticCurveTo(cx - 25, 292, cx - 50, 302);
    ctx.stroke();
    // Right side
    ctx.beginPath();
    ctx.moveTo(cx, 298);
    ctx.quadraticCurveTo(cx + 25, 292, cx + 50, 302);
    ctx.stroke();
  } else if (facialHair === 'stubble') {
    ctx.fillStyle = `${hairColor}55`;
    const seed = simpleHash(hairColor);
    for (let i = 0; i < 100; i++) {
      const angle = ((seed + i * 137) % 360) * (Math.PI / 180);
      const dist = 30 + ((seed + i * 73) % 80);
      const sx = cx + Math.cos(angle) * dist;
      const sy = 320 + Math.sin(angle) * dist * 0.5;
      if (sy > 285 && sy < 400 && sx > 160 && sx < 352) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  hairStyle: ChibiFaceInput['hairStyle'],
  hairColor: string,
): void {
  if (hairStyle === 'bald') return;

  const cx = 256;
  ctx.fillStyle = hairColor;

  // Base cap shape shared by all non-bald styles
  const drawCap = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 190, 200);
    ctx.quadraticCurveTo(cx - 200, 80, cx, 40);
    ctx.quadraticCurveTo(cx + 200, 80, cx + 190, 200);
    // Close across forehead line
    ctx.lineTo(cx + 160, 170);
    ctx.quadraticCurveTo(cx, 130, cx - 160, 170);
    ctx.closePath();
    ctx.fill();
  };

  switch (hairStyle) {
    case 'short': {
      drawCap();
      break;
    }
    case 'long': {
      drawCap();
      // Side panels extending down
      ctx.beginPath();
      ctx.moveTo(cx - 190, 200);
      ctx.quadraticCurveTo(cx - 200, 320, cx - 160, 420);
      ctx.lineTo(cx - 130, 420);
      ctx.quadraticCurveTo(cx - 150, 300, cx - 160, 200);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 190, 200);
      ctx.quadraticCurveTo(cx + 200, 320, cx + 160, 420);
      ctx.lineTo(cx + 130, 420);
      ctx.quadraticCurveTo(cx + 150, 300, cx + 160, 200);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'ponytail': {
      drawCap();
      // Small bump at back-top
      ctx.beginPath();
      ctx.arc(cx, 30, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, 10, 14, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'topknot': {
      drawCap();
      // Tall narrow bump on top
      ctx.beginPath();
      ctx.moveTo(cx - 20, 50);
      ctx.quadraticCurveTo(cx - 24, -10, cx, -30);
      ctx.quadraticCurveTo(cx + 24, -10, cx + 20, 50);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'braided': {
      drawCap();
      // Two side strands (braids)
      for (const sign of [-1, 1]) {
        const bx = cx + sign * 170;
        ctx.beginPath();
        ctx.moveTo(bx, 190);
        ctx.quadraticCurveTo(bx + sign * 10, 280, bx - sign * 5, 370);
        ctx.quadraticCurveTo(bx - sign * 15, 380, bx - sign * 5, 390);
        // Braid tip bulge
        ctx.arc(bx - sign * 5, 390, 12, 0, Math.PI * 2);
        ctx.fill();
        // Braid body
        ctx.beginPath();
        ctx.moveTo(bx, 190);
        ctx.quadraticCurveTo(bx + sign * 10, 280, bx - sign * 5, 370);
        ctx.lineTo(bx - sign * 20, 370);
        ctx.quadraticCurveTo(bx - sign * 5, 280, bx - 15 * sign, 190);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'wild': {
      // Irregular jagged cap
      ctx.beginPath();
      ctx.moveTo(cx - 210, 220);
      ctx.lineTo(cx - 200, 120);
      ctx.lineTo(cx - 170, 80);
      ctx.lineTo(cx - 140, 100);
      ctx.lineTo(cx - 110, 30);
      ctx.lineTo(cx - 60, 60);
      ctx.lineTo(cx - 30, 10);
      ctx.lineTo(cx + 20, 50);
      ctx.lineTo(cx + 70, 5);
      ctx.lineTo(cx + 110, 55);
      ctx.lineTo(cx + 150, 25);
      ctx.lineTo(cx + 175, 90);
      ctx.lineTo(cx + 205, 110);
      ctx.lineTo(cx + 210, 220);
      // Forehead curve back
      ctx.quadraticCurveTo(cx + 170, 170, cx, 155);
      ctx.quadraticCurveTo(cx - 170, 170, cx - 210, 220);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'hooded': {
      // Full sides coverage
      ctx.beginPath();
      ctx.moveTo(cx - 220, 400);
      ctx.quadraticCurveTo(cx - 230, 200, cx - 210, 100);
      ctx.quadraticCurveTo(cx, 10, cx + 210, 100);
      ctx.quadraticCurveTo(cx + 230, 200, cx + 220, 400);
      // Inner cutout for face
      ctx.lineTo(cx + 150, 380);
      ctx.quadraticCurveTo(cx + 170, 250, cx + 150, 170);
      ctx.quadraticCurveTo(cx, 120, cx - 150, 170);
      ctx.quadraticCurveTo(cx - 170, 250, cx - 150, 380);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

export function createChibiFaceTexture(
  config: ChibiFaceInput,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      'Failed to get 2D canvas context for chibi face texture generation',
    );
  }

  // Clear to transparent
  ctx.clearRect(0, 0, size, size);

  // 1. Base skin with radial gradient
  drawSkinBase(ctx, config.skinTone);

  // 2. Eyebrows
  drawEyebrows(ctx, config.expression, config.hairColor);

  // 3. Eyes
  drawEyes(ctx, config.expression, config.eyeColor);

  // 4. Mouth
  drawMouth(ctx, config.expression);

  // 5. Facial hair (drawn before hair so long hair overlaps correctly)
  drawFacialHair(ctx, config.facialHair, config.hairColor);

  // 6. Hair (on top of everything)
  drawHair(ctx, config.hairStyle, config.hairColor);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
