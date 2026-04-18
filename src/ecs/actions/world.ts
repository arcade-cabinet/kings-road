import { WorldSession } from '@/ecs/traits/session-world';
import { getSessionEntity } from '@/ecs/world';
import {
  type KingdomConfig,
  KingdomConfigSchema,
  type KingdomMap,
  type MapTile,
} from '@/schemas/kingdom.schema';
import { CHUNK_SIZE } from '@/utils/worldCoords';
import {
  buildFeatureIndex,
  generateFeaturePlacementsWithDensity,
  getFeaturesAtTile,
  type PlacedFeature,
} from '@/world/feature-placement';
import {
  generateKingdomAsync,
  getKingdomTile,
  getRegionAt,
  getSettlementAt,
} from '@/world/kingdom-gen';
import kingdomConfigJson from '../../content/world/kingdom-config.json';

export const kingdomConfig: KingdomConfig =
  KingdomConfigSchema.parse(kingdomConfigJson);

type WorldState = {
  kingdomMap: KingdomMap | null;
  isGenerating: boolean;
  generationProgress: number;
  generationPhase: string;
  featurePlacements: PlacedFeature[];
  featureIndex: Map<string, PlacedFeature[]>;
};

type SessionProxy = {
  has: (t: typeof WorldSession) => boolean;
  add: (t: typeof WorldSession) => void;
  get: (t: typeof WorldSession) => WorldState;
  set: (t: typeof WorldSession, value: WorldState) => void;
};

function session(): SessionProxy {
  const proxy = getSessionEntity() as unknown as SessionProxy;
  if (!proxy.has(WorldSession)) proxy.add(WorldSession);
  return proxy;
}

function patch(update: Partial<WorldState>): void {
  const s = session();
  s.set(WorldSession, { ...s.get(WorldSession), ...update });
}

export function getWorldState(): WorldState {
  return session().get(WorldSession);
}

export function setWorldState(update: Partial<WorldState>): void {
  patch(update);
}

export async function generateWorld(seed: string): Promise<KingdomMap> {
  patch({
    isGenerating: true,
    generationProgress: 0,
    generationPhase: 'Unrolling the realm parchment...',
  });

  const map = await generateKingdomAsync(
    seed,
    kingdomConfig,
    (progress, phase) => {
      patch({ generationProgress: progress, generationPhase: phase });
    },
  );

  const regionDensities = new Map<string, 'sparse' | 'normal' | 'dense'>();
  for (const authoredRegion of kingdomConfig.regions ?? []) {
    regionDensities.set(authoredRegion.id, authoredRegion.featureDensity);
  }
  const placements = generateFeaturePlacementsWithDensity(
    map,
    seed,
    regionDensities,
  );
  const index = buildFeatureIndex(placements);

  map.features = placements.map((p) => ({
    id: p.id,
    featureId: p.definition.id,
    tier: p.definition.tier,
    position: p.gridPosition,
    regionId: p.regionId,
  }));

  patch({
    kingdomMap: map,
    isGenerating: false,
    generationProgress: 1,
    generationPhase: '',
    featurePlacements: placements,
    featureIndex: index,
  });

  return map;
}

export function clearWorld(): void {
  patch({
    kingdomMap: null,
    isGenerating: false,
    generationProgress: 0,
    generationPhase: '',
    featurePlacements: [],
    featureIndex: new Map(),
  });
}

export function getTileAtWorld(
  worldX: number,
  worldZ: number,
): MapTile | undefined {
  const { kingdomMap } = getWorldState();
  if (!kingdomMap) return undefined;
  const gx = Math.floor(worldX / CHUNK_SIZE);
  const gy = Math.floor(worldZ / CHUNK_SIZE);
  return getKingdomTile(kingdomMap, gx, gy);
}

export function getTileAtGrid(gx: number, gy: number): MapTile | undefined {
  const { kingdomMap } = getWorldState();
  if (!kingdomMap) return undefined;
  return getKingdomTile(kingdomMap, gx, gy);
}

export function getFeaturesAt(gx: number, gy: number): PlacedFeature[] {
  return getFeaturesAtTile(getWorldState().featureIndex, gx, gy);
}

export { getKingdomTile, getRegionAt, getSettlementAt };
