import type { VegetationPlacement } from '@/composition/vegetation';
import { CompositionLayer } from '@app/scene/CompositionLayer';

interface BiomeVegetationRendererProps {
  placements: VegetationPlacement[];
}

/** Renders biome vegetation placements as instanced GLBs — one draw call per species. */
export function BiomeVegetationRenderer({ placements }: BiomeVegetationRendererProps) {
  return <CompositionLayer placements={placements} />;
}
