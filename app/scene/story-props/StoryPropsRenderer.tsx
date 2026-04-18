import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { addGlobalInteractables, removeGlobalInteractables } from '@/ecs/actions/game';
import type { StoryPropPlacement } from '@/composition/story-props';
import type { Interactable } from '@/types/game';
import { CompositionLayer } from '@app/scene/CompositionLayer';

interface StoryPropsRendererProps {
  placements: StoryPropPlacement[];
}

/**
 * Renders story-prop compositor output as instanced GLBs and registers
 * props that carry narrativeText as interactables for dialogue popups.
 */
export function StoryPropsRenderer({ placements }: StoryPropsRendererProps) {
  const interactables = useMemo<Interactable[]>(() => {
    return placements
      .filter((p) => p.narrativeText)
      .map((p) => ({
        id: `story-prop:${p.assetId}:${p.position.x.toFixed(1)},${p.position.z.toFixed(1)}`,
        position: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
        radius: 4,
        type: 'wanderer' as const,
        name: p.archetype,
        dialogueText: p.narrativeText!,
        actionVerb: 'EXAMINE',
      }));
  }, [placements]);

  useEffect(() => {
    if (interactables.length === 0) return;
    addGlobalInteractables(interactables);
    return () => removeGlobalInteractables(interactables);
  }, [interactables]);

  return <CompositionLayer placements={placements} />;
}
