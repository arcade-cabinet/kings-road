import { useTrait } from 'koota/react';
import { WorldSession } from '@/ecs/traits/session-world';
import { getSessionEntity } from '@/ecs/world';

const EMPTY_FEATURE_INDEX = new Map();

/**
 * Reactive accessor for session world state.
 *
 * Returns a stable-shape default even when the trait hasn't been attached
 * yet (pre-generation), so callers can safely destructure fields.
 */
export function useWorldSession() {
  const trait = useTrait(getSessionEntity(), WorldSession);
  return (
    trait ?? {
      kingdomMap: null,
      isGenerating: false,
      generationProgress: 0,
      generationPhase: '',
      featurePlacements: [],
      featureIndex: EMPTY_FEATURE_INDEX,
    }
  );
}
