// All schemas — barrel pass-through, no behavior changes

import roadSpineData from './world/road-spine.json';

export const roadSpine = roadSpineData;

// Content query functions — barrel pass-through, no behavior changes
export {
  getAllBuildings,
  getAllDungeons,
  getAllFeatures,
  getAllItems,
  getAllMonsters,
  getAllNamedNpcs,
  getAllNpcPools,
  getAllQuests,
  getAllTowns,
  getBuilding,
  getDungeon,
  getEncounter,
  getEncountersByType,
  getEncounterTable,
  getFeature,
  getFeaturesByTier,
  getItem,
  getItemsByType,
  getLootTable,
  getLootTableByTier,
  getMonster,
  getMonstersByTier,
  getNamedNpc,
  getNpcPool,
  getPacingConfig,
  getQuest,
  getRoadSpine,
  getTown,
  initContentStore,
  isContentStoreReady,
} from '@/db/content-queries';
export * from '@/schemas';
