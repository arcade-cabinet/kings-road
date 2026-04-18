import * as THREE from 'three';

type TextureType =
  | 'plaster'
  | 'stone_block'
  | 'thatch'
  | 'wood'
  | 'door'
  | 'crate'
  | 'window'
  | 'road'
  | 'grass'
  | 'cobblestone';

export function createProceduralTexture(
  type: TextureType,
  seed: number = Math.random() * 10000,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Simple seeded random
  let rngSeed = seed;
  const rng = () => {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  };

  switch (type) {
    case 'plaster':
      ctx.fillStyle = '#ede4d3';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle =
          rng() > 0.5 ? 'rgba(160,140,110,0.08)' : 'rgba(230,220,200,0.15)';
        ctx.fillRect(rng() * 512, rng() * 512, 4, 4);
      }
      // Add some cracks
      ctx.strokeStyle = 'rgba(120,100,80,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        let x = rng() * 512;
        let y = rng() * 512;
        ctx.moveTo(x, y);
        for (let j = 0; j < 8; j++) {
          x += (rng() - 0.5) * 60;
          y += rng() * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;

    case 'stone_block':
      ctx.fillStyle = '#a89078';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 64) {
        const offset = y % 128 === 0 ? 0 : 64;
        for (let x = -64; x < 512; x += 128) {
          // Warm stone variation (honey limestone)
          const brightness = 0.85 + rng() * 0.3;
          ctx.fillStyle = `rgb(${Math.floor(168 * brightness)}, ${Math.floor(144 * brightness)}, ${Math.floor(120 * brightness)})`;
          ctx.fillRect(x + offset + 4, y + 4, 120, 56);

          // Add moss/weathering
          if (rng() > 0.7) {
            ctx.fillStyle = 'rgba(80,100,60,0.2)';
            ctx.fillRect(x + offset + 4, y + 4, 120 * rng(), 56);
          }
        }
      }
      // Mortar lines
      ctx.strokeStyle = '#8a7a68';
      ctx.lineWidth = 4;
      for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      break;

    case 'thatch':
      ctx.fillStyle = '#c4a83a';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#8b7722';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3000; i++) {
        const x = rng() * 512;
        const y = rng() * 512;
        const length = rng() * 40 + 20;
        const angle = (rng() - 0.5) * 0.3;
        ctx.strokeStyle = rng() > 0.5 ? '#8b7722' : '#d4b84a';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(angle) * 10, y + length);
        ctx.stroke();
      }
      break;

    case 'wood':
      ctx.fillStyle = '#7a5c3a';
      ctx.fillRect(0, 0, 512, 512);
      // Wood grain vertical lines
      ctx.fillStyle = '#5a4028';
      for (let x = 0; x < 512; x += 64) {
        ctx.fillRect(x, 0, 4, 512);
      }
      // Grain details
      ctx.strokeStyle = 'rgba(60,40,20,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 200; i++) {
        const x = rng() * 512;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(
          x + (rng() - 0.5) * 20,
          128,
          x + (rng() - 0.5) * 20,
          384,
          x + (rng() - 0.5) * 10,
          512,
        );
        ctx.stroke();
      }
      // Knots
      for (let i = 0; i < 3; i++) {
        const x = rng() * 512;
        const y = rng() * 512;
        ctx.fillStyle = '#4a3520';
        ctx.beginPath();
        ctx.ellipse(x, y, 8 + rng() * 8, 12 + rng() * 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'door':
      ctx.fillStyle = '#6b4d31';
      ctx.fillRect(0, 0, 512, 512);
      // Frame
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(0, 0, 24, 512);
      ctx.fillRect(488, 0, 24, 512);
      ctx.fillRect(0, 0, 512, 24);
      // Panels
      ctx.strokeStyle = '#5a3e28';
      ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, 180, 200);
      ctx.strokeRect(292, 40, 180, 200);
      ctx.strokeRect(40, 272, 432, 200);
      // Handle
      ctx.fillStyle = '#5a4030';
      ctx.beginPath();
      ctx.arc(420, 300, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8962e';
      ctx.beginPath();
      ctx.arc(420, 300, 12, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'crate':
      ctx.fillStyle = '#6b4d31';
      ctx.fillRect(0, 0, 512, 512);
      // Frame
      ctx.fillStyle = '#3d2b1a';
      ctx.fillRect(0, 0, 512, 40);
      ctx.fillRect(0, 472, 512, 40);
      ctx.fillRect(0, 0, 40, 512);
      ctx.fillRect(472, 0, 40, 512);
      // Cross bracing
      ctx.lineWidth = 30;
      ctx.strokeStyle = '#3d2b1a';
      ctx.beginPath();
      ctx.moveTo(40, 40);
      ctx.lineTo(472, 472);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(472, 40);
      ctx.lineTo(40, 472);
      ctx.stroke();
      // Nails
      ctx.fillStyle = '#555';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(20 + rng() * 472, 20 + rng() * 472, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'window': {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 512, 512);
      // Glowing panes
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
      gradient.addColorStop(0, '#ffcc66');
      gradient.addColorStop(0.5, '#cc8833');
      gradient.addColorStop(1, '#663311');
      ctx.fillStyle = gradient;
      ctx.fillRect(40, 40, 192, 192);
      ctx.fillRect(280, 40, 192, 192);
      ctx.fillRect(40, 280, 192, 192);
      ctx.fillRect(280, 280, 192, 192);
      // Window frame
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(232, 0, 48, 512);
      ctx.fillRect(0, 232, 512, 48);
      ctx.fillRect(0, 0, 40, 512);
      ctx.fillRect(472, 0, 40, 512);
      ctx.fillRect(0, 0, 512, 40);
      ctx.fillRect(0, 472, 512, 40);
      break;
    }

    case 'road':
      ctx.fillStyle = '#8b7a60';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5000; i++) {
        const brightness = rng() > 0.5 ? '#7a6a50' : '#9c8c70';
        ctx.fillStyle = brightness;
        const size = rng() * 12 + 4;
        ctx.fillRect(rng() * 512, rng() * 512, size, size);
      }
      // Cart tracks
      ctx.strokeStyle = 'rgba(80,65,45,0.4)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(180, 0);
      ctx.lineTo(180, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(332, 0);
      ctx.lineTo(332, 512);
      ctx.stroke();
      break;

    case 'grass':
      ctx.fillStyle = '#4a7a3a';
      ctx.fillRect(0, 0, 512, 512);
      // Grass blades - lush green
      for (let i = 0; i < 2000; i++) {
        const x = rng() * 512;
        const y = rng() * 512;
        const hue = 100 + rng() * 30;
        const lightness = 30 + rng() * 20;
        ctx.strokeStyle = `hsl(${hue}, 50%, ${lightness}%)`;
        ctx.lineWidth = 1 + rng();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 8, y - rng() * 12);
        ctx.stroke();
      }
      // Wildflower patches
      for (let i = 0; i < 10; i++) {
        const x = rng() * 512;
        const y = rng() * 512;
        ctx.fillStyle = `rgba(80,60,40,${0.1 + rng() * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          20 + rng() * 30,
          15 + rng() * 20,
          rng() * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;

    case 'cobblestone':
      ctx.fillStyle = '#9a8a72';
      ctx.fillRect(0, 0, 512, 512);
      // Draw stones
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const offsetX = (y % 2) * 32;
          const stoneX = x * 64 + offsetX + rng() * 8;
          const stoneY = y * 64 + rng() * 8;
          const width = 56 + rng() * 8;
          const height = 56 + rng() * 8;

          const brightness = 0.8 + rng() * 0.4;
          ctx.fillStyle = `rgb(${Math.floor(155 * brightness)}, ${Math.floor(140 * brightness)}, ${Math.floor(115 * brightness)})`;

          ctx.beginPath();
          ctx.roundRect(stoneX, stoneY, width, height, 8);
          ctx.fill();
        }
      }
      break;

    default:
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

// Material cache
let materialsCache: Record<string, THREE.MeshStandardMaterial> | null = null;

export function getMaterials() {
  if (materialsCache) return materialsCache;

  materialsCache = {
    townWall: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('plaster'),
      roughness: 0.9,
      roughnessMap: createProceduralTexture('plaster', 54321),
    }),
    dungeonWall: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('stone_block'),
      roughness: 0.85,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
    wood: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('wood'),
      roughness: 0.8,
    }),
    roof: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('thatch'),
      roughness: 1.0,
    }),
    door: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('door'),
      roughness: 0.7,
      side: THREE.DoubleSide,
    }),
    windowGlow: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('window'),
      emissive: 0xffaa44,
      emissiveIntensity: 0,
    }),
    crate: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('crate'),
      roughness: 0.9,
    }),
    pineTrunk: new THREE.MeshStandardMaterial({
      color: 0x5a4028,
      roughness: 1.0,
    }),
    pineLeaves: new THREE.MeshStandardMaterial({
      color: 0x3a6a2a,
      roughness: 1.0,
    }),
    oakTrunk: new THREE.MeshStandardMaterial({
      color: 0x6b4a2a,
      roughness: 0.95,
    }),
    oakLeaves: new THREE.MeshStandardMaterial({
      color: 0x5a8a3a,
      roughness: 1.0,
    }),
    bush: new THREE.MeshStandardMaterial({
      color: 0x4a7a30,
      roughness: 1.0,
    }),
    grassTuft: new THREE.MeshStandardMaterial({
      color: 0x6a9a48,
      roughness: 1.0,
    }),
    deadTree: new THREE.MeshStandardMaterial({
      color: 0x6a5a48,
      roughness: 1.0,
    }),
    heather: new THREE.MeshStandardMaterial({
      color: 0x8a5a8a,
      roughness: 1.0,
    }),
    boulder: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('stone_block'),
      color: 0xa89078,
      roughness: 0.9,
    }),
    gem: new THREE.MeshStandardMaterial({
      color: 0xb8962e,
      emissive: 0x8b6f1f,
      roughness: 0.2,
      metalness: 0.5,
    }),
    groundTown: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('cobblestone'),
      roughness: 1.0,
    }),
    groundWild: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('grass'),
      roughness: 1.0,
    }),
    groundRoad: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('road'),
      roughness: 1.0,
    }),
    barrel: new THREE.MeshStandardMaterial({
      map: createProceduralTexture('wood'),
      roughness: 0.85,
    }),
    water: new THREE.MeshStandardMaterial({
      color: 0x2255aa,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.2,
    }),
  };

  return materialsCache;
}

// Update window emissive for day/night cycle
export function updateWindowEmissive(intensity: number) {
  if (materialsCache?.windowGlow) {
    materialsCache.windowGlow.emissiveIntensity = intensity;
  }
}

// ── Biome ground materials ────────────────────────────────────────────

const biomeGroundCache: Record<string, THREE.MeshStandardMaterial> = {};

/**
 * Map a kingdom biome to a ground material color/style.
 * Creates materials lazily and caches them.
 */
export function getBiomeGroundMaterial(
  biome: string,
): THREE.MeshStandardMaterial {
  if (biomeGroundCache[biome]) return biomeGroundCache[biome];

  const mats = getMaterials();
  let mat: THREE.MeshStandardMaterial;

  switch (biome) {
    case 'meadow':
      mat = new THREE.MeshStandardMaterial({ color: 0x7ab648, roughness: 1.0 });
      break;
    case 'farmland':
      mat = new THREE.MeshStandardMaterial({ color: 0x9a8a50, roughness: 1.0 });
      break;
    case 'forest':
      mat = new THREE.MeshStandardMaterial({ color: 0x4a7a38, roughness: 1.0 });
      break;
    case 'deep_forest':
      mat = new THREE.MeshStandardMaterial({ color: 0x2a5a22, roughness: 1.0 });
      break;
    case 'hills':
      mat = new THREE.MeshStandardMaterial({
        color: 0x8a9a60,
        roughness: 0.95,
      });
      break;
    case 'highland':
      mat = new THREE.MeshStandardMaterial({ color: 0x7a8858, roughness: 0.9 });
      break;
    case 'mountain':
      mat = new THREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        roughness: 0.85,
      });
      break;
    case 'moor':
      mat = new THREE.MeshStandardMaterial({ color: 0x6a6a48, roughness: 1.0 });
      break;
    case 'swamp':
      mat = new THREE.MeshStandardMaterial({ color: 0x4a5a30, roughness: 1.0 });
      break;
    case 'riverside':
      mat = new THREE.MeshStandardMaterial({ color: 0x5a9a48, roughness: 1.0 });
      break;
    case 'coast':
      mat = new THREE.MeshStandardMaterial({
        color: 0xc8b888,
        roughness: 0.95,
      });
      break;
    case 'ocean':
      mat = mats.water;
      break;
    default:
      mat = mats.groundWild;
  }

  biomeGroundCache[biome] = mat;
  return mat;
}
