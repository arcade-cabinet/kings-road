import type { RuinsPlacement } from '@/composition/ruins';
import { CompositionLayer } from '@app/scene/CompositionLayer';

interface VillageRendererProps {
  placements: RuinsPlacement[];
}

/** Renders ruined-village (and future living-village) compositor output as instanced GLBs. */
export function VillageRenderer({ placements }: VillageRendererProps) {
  return <CompositionLayer placements={placements} />;
}
