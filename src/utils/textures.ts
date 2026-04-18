import * as THREE from 'three';
import { assetUrl } from '@/lib/assets';

/**
 * Texture types supported by the PBR material system.
 *
 * 'door' and 'crate' alias to 'wood' — the same cached material instance
 * is returned. Callers that need to tint or mutate should `.clone()` it.
 * 'window' keeps a minimal canvas fallback — tiny illuminated panes don't
 * benefit from PBR and the emissive+gradient effect is better authored in
 * canvas for the diegetic glow.
 */
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

// ── Polyhaven PBR asset mapping ──────────────────────────────────────────────
// Each entry maps a TextureType to a public/textures/<dir>/ path.
// Source: Polyhaven CC0 textures at 1k resolution.
// Assets: painted_plaster_wall, rustic_stone_wall_02, thatch_roof_angled,
//         medieval_wood, red_dirt_mud_01, brown_mud_leaves_01, cobblestone_large_01
const PBR_DIRS: Partial<Record<TextureType, string>> = {
  plaster: 'textures/plaster',
  stone_block: 'textures/stone_block',
  thatch: 'textures/thatch',
  wood: 'textures/wood',
  road: 'textures/road',
  grass: 'textures/grass',
  cobblestone: 'textures/cobblestone',
  // 'window' intentionally absent — uses canvas fallback below
};

// 'door' and 'crate' alias to 'wood' so the same material instance is shared.
const TYPE_ALIAS: Partial<Record<TextureType, TextureType>> = {
  door: 'wood',
  crate: 'wood',
};

// ── Module-level texture loader and cache ────────────────────────────────────
const loader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadMap(path: string, colorSpace: THREE.ColorSpace): THREE.Texture {
  const key = `${path}|${colorSpace}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }
  const resolved = assetUrl(path);
  const tex = loader.load(resolved, undefined, undefined, (err) => {
    // Hard-fail to ErrorOverlay rather than silently render missing textures
    throw new Error(
      `Failed to load texture ${resolved}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  });
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

// ── PBR material cache ────────────────────────────────────────────────────────
const pbrCache = new Map<TextureType, THREE.MeshStandardMaterial>();

/**
 * Load and return a cached MeshStandardMaterial backed by Polyhaven PBR maps.
 * Diffuse uses SRGBColorSpace; normal/roughness use NoColorSpace (per three.js
 * recommendation — they are non-color data). aoMap is omitted here because
 * three.js requires a second UV set (geometry.uv2) for aoMap; our procedurally-
 * generated geometries only define a single UV set.
 *
 * For 'window', falls back to a canvas-drawn emissive texture (illuminated
 * panes). Aliased types ('door', 'crate') return the same cached material
 * instance as 'wood' — clone before mutating.
 */
export function loadPbrMaterial(type: TextureType): THREE.MeshStandardMaterial {
  const canonical = TYPE_ALIAS[type] ?? type;
  const cached = pbrCache.get(canonical);
  if (cached) return cached;

  const dir = PBR_DIRS[canonical];

  if (!dir) {
    // Canvas fallback for 'window'
    const mat = buildWindowFallback();
    pbrCache.set(canonical, mat);
    return mat;
  }

  const diffuse = loadMap(`${dir}/diffuse.jpg`, THREE.SRGBColorSpace);
  const normal = loadMap(`${dir}/normal.jpg`, THREE.NoColorSpace);
  const roughness = loadMap(`${dir}/roughness.jpg`, THREE.NoColorSpace);

  const mat = new THREE.MeshStandardMaterial({
    map: diffuse,
    normalMap: normal,
    roughnessMap: roughness,
    roughness: 1.0,
    metalness: 0.0,
  });

  pbrCache.set(canonical, mat);
  return mat;
}

// ── Window canvas fallback ───────────────────────────────────────────────────
// Tiny illuminated panes — emissive glow is authored in canvas because the
// effect is fundamentally emissive, not PBR-reflective.
function buildWindowFallback(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      'Canvas 2D context is unavailable — cannot build window texture fallback',
    );
  }

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 128, 128);

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 72);
  gradient.addColorStop(0, '#ffcc66');
  gradient.addColorStop(0.5, '#cc8833');
  gradient.addColorStop(1, '#663311');
  ctx.fillStyle = gradient;
  ctx.fillRect(8, 8, 50, 50);
  ctx.fillRect(70, 8, 50, 50);
  ctx.fillRect(8, 70, 50, 50);
  ctx.fillRect(70, 70, 50, 50);

  // Window frame
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(58, 0, 12, 128);
  ctx.fillRect(0, 58, 128, 12);
  ctx.fillRect(0, 0, 8, 128);
  ctx.fillRect(120, 0, 8, 128);
  ctx.fillRect(0, 0, 128, 8);
  ctx.fillRect(0, 120, 128, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffaa44,
    emissiveIntensity: 0,
  });
}

// ── Shared material cache (getMaterials) ─────────────────────────────────────
let materialsCache: Record<string, THREE.MeshStandardMaterial> | null = null;

export function getMaterials() {
  if (materialsCache) return materialsCache;

  materialsCache = {
    townWall: loadPbrMaterial('plaster'),
    dungeonWall: loadPbrMaterial('stone_block'),
    wood: loadPbrMaterial('wood'),
    roof: loadPbrMaterial('thatch'),
    door: (() => {
      const m = loadPbrMaterial('door').clone();
      m.side = THREE.DoubleSide;
      return m;
    })(),
    windowGlow: loadPbrMaterial('window'),
    crate: loadPbrMaterial('crate'),
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
    boulder: (() => {
      const m = loadPbrMaterial('stone_block').clone();
      m.color.set(0xa89078);
      return m;
    })(),
    gem: new THREE.MeshStandardMaterial({
      color: 0xb8962e,
      emissive: 0x8b6f1f,
      roughness: 0.2,
      metalness: 0.5,
    }),
    groundTown: loadPbrMaterial('cobblestone'),
    groundWild: loadPbrMaterial('grass'),
    groundRoad: loadPbrMaterial('road'),
    barrel: loadPbrMaterial('wood').clone(),
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

// ── Day/night window emissive update ─────────────────────────────────────────
export function updateWindowEmissive(intensity: number) {
  // Update the canonical cached material so every consumer sees the change,
  // whether they obtained the material via loadPbrMaterial('window') directly
  // or via getMaterials().windowGlow (the latter holds the same reference).
  const windowMat = pbrCache.get('window');
  if (windowMat) {
    windowMat.emissiveIntensity = intensity;
  }
}

// ── Biome ground materials ────────────────────────────────────────────────────
const biomeGroundCache: Record<string, THREE.MeshStandardMaterial> = {};

/**
 * Map a kingdom biome to a ground material. Creates lazily and caches.
 * Biomes without authored PBR use flat color materials for performance.
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
