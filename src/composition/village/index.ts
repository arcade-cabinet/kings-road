// Phase A — parts catalog

// Phase B — composers
export { composeBuilding } from './composeBuilding';
export { composeTownLayout } from './composeTownLayout';
export {
  getPartsByRole,
  VILLAGE_PARTS,
  VILLAGE_PARTS_ARRAY,
} from './parts/catalog';
export {
  type VillageFootprint,
  VillageFootprintSchema,
  type VillagePart,
  type VillagePartRole,
  VillagePartRoleSchema,
  VillagePartSchema,
} from './parts/schema';
export type {
  BuildingPlacement,
  TownBuildingSlot,
  VillageTownConfig,
} from './types';
