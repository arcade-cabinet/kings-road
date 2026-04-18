/** Opaque brand type for entity IDs */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** Opaque brand type for world seeds */
export type Seed = string & { readonly __brand: 'Seed' };

/** Biome identifier — matches biome JSON filenames */
export type BiomeId = string & { readonly __brand: 'BiomeId' };

/** Archetype identifier — matches archetype JSON keys */
export type Archetype = string & { readonly __brand: 'Archetype' };

/** Helper to cast a plain string to EntityId without runtime overhead */
export function asEntityId(id: string): EntityId {
  return id as EntityId;
}

/** Helper to cast a plain string to Seed */
export function asSeed(s: string): Seed {
  return s as Seed;
}

/** Helper to cast a plain string to BiomeId */
export function asBiomeId(id: string): BiomeId {
  return id as BiomeId;
}

/** Helper to cast a plain string to Archetype */
export function asArchetype(id: string): Archetype {
  return id as Archetype;
}
