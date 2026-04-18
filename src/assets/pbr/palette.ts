export type PbrPaletteEntry = {
  packPrefix: string;
};

/**
 * Tactile PBR palette. Maps a human-readable tactile ID to the AmbientCG pack
 * prefix for the directory under public/assets/pbr/.
 *
 * Thornfield materials are added in task #6 (content curation).
 */
export const PBR_PALETTE: Record<string, PbrPaletteEntry> = {};
