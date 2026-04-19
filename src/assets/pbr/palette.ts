export type PbrPaletteEntry = {
  packPrefix: string;
};

export const PBR_PALETTE: Record<string, PbrPaletteEntry> = {
  // Thornfield biome (already ingested)
  'grave-moss': { packPrefix: 'Moss001_1K-JPG' },
  'ivy-ground': { packPrefix: 'Ground037_1K-JPG' },
  'dead-grass': { packPrefix: 'Ground003_1K-JPG' },
  'packed-mud': { packPrefix: 'Ground002_1K-JPG' },
  'fallen-leaves': { packPrefix: 'Ground078_1K-JPG' },
  'wet-cobblestone': { packPrefix: 'PavingStones010_1K-JPG' },
  'mossy-stone': { packPrefix: 'Rock006_1K-JPG' },
  'lichen-stone': { packPrefix: 'Rock001_1K-JPG' },
  'thornfield-cairn-stone': { packPrefix: 'Rock048_1K-JPG' },
  'bleached-bone': { packPrefix: 'Ground080_1K-JPG' },
  'weathered-oak': { packPrefix: 'Bark012_1K-JPG' },
  'wet-bark': { packPrefix: 'Bark014_1K-JPG' },
  'rusted-iron': { packPrefix: 'Rust004_1K-JPG' },
  'black-ironwork': { packPrefix: 'Metal005_1K-JPG' },
  'grave-cloth-linen': { packPrefix: 'Fabric030_1K-JPG' },

  // Meadow biome (Ashford pastoral)
  'green-grass': { packPrefix: 'Grass002_1K-JPG' },
  'wildflower-field': { packPrefix: 'FlowerSet001_1K-JPG' },
  'packed-dirt': { packPrefix: 'Ground014_1K-JPG' },

  // Forest biome (Millbrook canopy)
  'forest-soil': { packPrefix: 'Ground034_1K-JPG' },
  'moss-ground': { packPrefix: 'Moss002_1K-JPG' },
  'leaf-litter': { packPrefix: 'Leaf001_1K-JPG' },

  // Moor biome (Ravensgate bogland)
  'boggy-peat': { packPrefix: 'Ground027_1K-JPG' },
  heather: { packPrefix: 'Grass005_1K-JPG' },
  'wet-mud': { packPrefix: 'Ground022_1K-JPG' },
};
