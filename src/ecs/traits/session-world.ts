import { trait } from 'koota';
import type { KingdomMap } from '@/schemas/kingdom.schema';
import type { PlacedFeature } from '@/world/feature-placement';

/**
 * Session-scoped world state (generated kingdom + feature placements).
 *
 * Created once at New Game via generateWorld(); persists for the session.
 * Consumers use useWorldSession() (hook) or getWorldState() (imperative).
 */
export const WorldSession = trait(() => ({
  kingdomMap: null as KingdomMap | null,
  isGenerating: false,
  generationProgress: 0,
  generationPhase: '',
  featurePlacements: [] as PlacedFeature[],
  featureIndex: new Map<string, PlacedFeature[]>(),
}));
