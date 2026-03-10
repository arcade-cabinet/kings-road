/**
 * World store — holds the generated kingdom map.
 *
 * Created once at New Game time via generateKingdom().
 * Chunks READ from this at runtime — no per-chunk type resolution needed.
 * The store persists for the entire game session.
 */

import { create } from 'zustand';
// Load the authored kingdom config
import kingdomConfigJson from '../../../content/world/kingdom-config.json';
import type {
  KingdomConfig,
  KingdomMap,
  MapTile,
} from '../../schemas/kingdom.schema';
import { KingdomConfigSchema } from '../../schemas/kingdom.schema';
import { CHUNK_SIZE } from '../utils/worldCoords';
import {
  buildFeatureIndex,
  generateFeaturePlacementsWithDensity,
  getFeaturesAtTile,
  type PlacedFeature,
} from '../world/feature-placement';
import {
  generateKingdomAsync,
  getKingdomTile,
  getRegionAt,
  getSettlementAt,
} from '../world/kingdom-gen';

interface WorldState {
  /** The generated kingdom map (null until New Game) */
  kingdomMap: KingdomMap | null;

  /** Whether the kingdom is currently being generated */
  isGenerating: boolean;

  /** Generation progress (0-1) for the loading screen */
  generationProgress: number;

  /** Current generation phase description */
  generationPhase: string;

  /** The validated kingdom config */
  config: KingdomConfig;

  /** Pre-generated feature placements from the kingdom map */
  featurePlacements: PlacedFeature[];

  /** Spatial index: grid key "x,y" → features at that tile */
  featureIndex: Map<string, PlacedFeature[]>;

  // ── Actions ──────────────────────────────────────────────────────

  /** Generate a new kingdom from a seed. Called at New Game time. */
  generateWorld: (seed: string) => Promise<KingdomMap>;

  /** Clear the kingdom (back to menu) */
  clearWorld: () => void;

  // ── Lookups (convenience wrappers) ───────────────────────────────

  /** Get the map tile at world position (world coords → grid coords) */
  getTileAtWorld: (worldX: number, worldZ: number) => MapTile | undefined;

  /** Get the map tile at grid coordinates */
  getTileAtGrid: (gx: number, gy: number) => MapTile | undefined;

  /** Get placed features at a grid position */
  getFeaturesAt: (gx: number, gy: number) => PlacedFeature[];
}

/**
 * Convert world coordinates to kingdom map grid coordinates.
 * Each grid tile corresponds to one chunk.
 */
export function worldToGrid(worldX: number, worldZ: number): [number, number] {
  return [Math.floor(worldX / CHUNK_SIZE), Math.floor(worldZ / CHUNK_SIZE)];
}

/**
 * Convert kingdom map grid coordinates to world origin.
 */
export function gridToWorldOrigin(gx: number, gy: number): [number, number] {
  return [gx * CHUNK_SIZE, gy * CHUNK_SIZE];
}

// Parse and validate the config once at module load
const config = KingdomConfigSchema.parse(kingdomConfigJson);

export const useWorldStore = create<WorldState>((set, get) => ({
  kingdomMap: null,
  isGenerating: false,
  generationProgress: 0,
  generationPhase: '',
  config,
  featurePlacements: [],
  featureIndex: new Map(),

  generateWorld: async (seed: string) => {
    set({
      isGenerating: true,
      generationProgress: 0,
      generationPhase: 'Unrolling the realm parchment...',
    });

    // generateKingdomAsync yields to the UI between each phase,
    // calling onProgress so the loading screen shows real progress.
    const map = await generateKingdomAsync(seed, config, (progress, phase) => {
      set({ generationProgress: progress, generationPhase: phase });
    });

    // Generate feature placements from authored region densities
    const regionDensities = new Map<string, 'sparse' | 'normal' | 'dense'>();
    for (const authoredRegion of config.regions ?? []) {
      regionDensities.set(authoredRegion.id, authoredRegion.featureDensity);
    }
    const placements = generateFeaturePlacementsWithDensity(
      map,
      seed,
      regionDensities,
    );
    const index = buildFeatureIndex(placements);

    // Populate the map's serializable features array from runtime placements
    map.features = placements.map((p) => ({
      id: p.id,
      featureId: p.definition.id,
      tier: p.definition.tier,
      position: p.gridPosition,
      regionId: p.regionId,
    }));

    set({
      kingdomMap: map,
      isGenerating: false,
      generationProgress: 1,
      generationPhase: '',
      featurePlacements: placements,
      featureIndex: index,
    });

    return map;
  },

  clearWorld: () => {
    set({
      kingdomMap: null,
      isGenerating: false,
      generationProgress: 0,
      generationPhase: '',
      featurePlacements: [],
      featureIndex: new Map(),
    });
  },

  getTileAtWorld: (worldX: number, worldZ: number) => {
    const map = get().kingdomMap;
    if (!map) return undefined;
    const [gx, gy] = worldToGrid(worldX, worldZ);
    return getKingdomTile(map, gx, gy);
  },

  getTileAtGrid: (gx: number, gy: number) => {
    const map = get().kingdomMap;
    if (!map) return undefined;
    return getKingdomTile(map, gx, gy);
  },

  getFeaturesAt: (gx: number, gy: number) => {
    const index = get().featureIndex;
    return getFeaturesAtTile(index, gx, gy);
  },
}));

// Re-export lookup helpers for use outside React components
export { getKingdomTile, getRegionAt, getSettlementAt };
